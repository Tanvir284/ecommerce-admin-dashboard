import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { useDebounce } from '../hooks/useDebounce';
import { Package, Plus, Search, Edit2, Trash2, AlertTriangle, Tag, Layers, Image as ImageIcon } from 'lucide-react';
import { motion } from 'framer-motion';

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

  const fetchProducts = async (isInitial = false) => {
    if (isInitial && products.length === 0) setIsLoading(true);
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
    fetchProducts(products.length === 0);
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
            <Package className="w-6 h-6 text-gray-900" />
            Product Catalog
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Browse, filter, and manage simple and variable products.
          </p>
        </div>

        {hasPermission('product:create') && (
          <Link
            to="/products/new"
            className="flex items-center gap-2 px-4 py-2.5 bg-black hover:bg-gray-800 text-white font-medium rounded-xl transition-all shadow-sm text-sm"
          >
            <Plus className="w-4 h-4" />
            Add New Product
          </Link>
        )}
      </div>

      {/* Search and Filters */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="relative w-full">
          <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or SKU..."
            className="w-full bg-white border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 rounded-xl pl-10 pr-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 outline-none shadow-sm transition-all"
          />
        </div>

        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="bg-white border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 rounded-xl px-4 py-2.5 text-sm text-gray-900 outline-none shadow-sm"
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
          className="bg-white border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 rounded-xl px-4 py-2.5 text-sm text-gray-900 outline-none shadow-sm"
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
          className="bg-white border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 rounded-xl px-4 py-2.5 text-sm text-gray-900 outline-none shadow-sm"
        >
          <option value="">All Statuses</option>
          <option value="ACTIVE">ACTIVE</option>
          <option value="INACTIVE">INACTIVE</option>
        </select>
      </div>

      {/* Paginated Product Table */}
      {isLoading && products.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 rounded w-1/4"></div>
          <div className="h-12 bg-gray-100 rounded"></div>
          <div className="h-12 bg-gray-100 rounded"></div>
        </div>
      ) : products.length === 0 ? (
        <div className="text-center py-12 bg-white border border-gray-200 rounded-2xl text-gray-500 shadow-sm text-sm">
          No products found in catalog.
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-gray-700">
              <thead className="bg-gray-50/80 text-xs text-gray-500 uppercase tracking-wider border-b border-gray-200 font-semibold">
                <tr>
                  <th className="px-6 py-3.5 font-semibold">Thumbnail & Product</th>
                  <th className="px-6 py-3.5 font-semibold">Brand</th>
                  <th className="px-6 py-3.5 font-semibold">Categories</th>
                  <th className="px-6 py-3.5 font-semibold">Price / Range</th>
                  <th className="px-6 py-3.5 font-semibold">Type & Stock</th>
                  <th className="px-6 py-3.5 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {products.map((p) => (
                  <tr key={p.id} className="hover:bg-gray-50/60 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-gray-50 border border-gray-200 flex items-center justify-center overflow-hidden shrink-0">
                          {p.thumbnail ? (
                            <img src={p.thumbnail.publicUrl} alt={p.name} className="w-full h-full object-cover" />
                          ) : (
                            <ImageIcon className="w-4 h-4 text-gray-400" />
                          )}
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900">{p.name}</p>
                          <p className="text-xs text-gray-400 font-mono">
                            SKU: {p.sku || (p.hasVariants ? 'Variants SKU' : 'N/A')}
                          </p>
                        </div>
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      {p.brand ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs bg-gray-100 text-gray-800 border border-gray-200 font-medium">
                          <Tag className="w-3 h-3 text-gray-500" /> {p.brand.name}
                        </span>
                      ) : (
                        <span className="text-gray-400 italic text-xs">No brand</span>
                      )}
                    </td>

                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1">
                        {p.categories && p.categories.length > 0 ? (
                          p.categories.map((c) => (
                            <span key={c.category.id} className="text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded font-medium border border-gray-200">
                              {c.category.name}
                            </span>
                          ))
                        ) : (
                          <span className="text-gray-400 italic text-xs">Uncategorized</span>
                        )}
                      </div>
                    </td>

                    <td className="px-6 py-4 font-semibold text-gray-900 font-mono">
                      {p.priceRange}
                    </td>

                    <td className="px-6 py-4">
                      {p.hasVariants ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs bg-purple-50 text-purple-700 border border-purple-200 font-medium">
                          <Layers className="w-3 h-3" /> Variable ({p.variants?.length || 0} variants)
                        </span>
                      ) : (
                        <div className="text-xs">
                          <span className="text-gray-900 font-medium">Simple Product</span>
                          <p className="text-gray-500">Stock: {p.stock || 0}</p>
                        </div>
                      )}
                    </td>

                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {hasPermission('product:update') && (
                          <Link
                            to={`/products/edit/${p.id}`}
                            className="p-1.5 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                            title="Edit Product"
                          >
                            <Edit2 className="w-4 h-4" />
                          </Link>
                        )}
                        {hasPermission('product:delete') && (
                          <button
                            onClick={() => handleDeleteProduct(p.id, p.name)}
                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
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
          <div className="p-4 bg-gray-50/60 border-t border-gray-200 flex items-center justify-between text-xs text-gray-500">
            <span>Page {page} of {totalPages}</span>
            <div className="flex items-center gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
                className="px-3 py-1.5 bg-white border border-gray-200 text-gray-700 font-medium rounded-lg disabled:opacity-40 hover:bg-gray-100 shadow-sm"
              >
                Previous
              </button>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage(page + 1)}
                className="px-3 py-1.5 bg-white border border-gray-200 text-gray-700 font-medium rounded-lg disabled:opacity-40 hover:bg-gray-100 shadow-sm"
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

