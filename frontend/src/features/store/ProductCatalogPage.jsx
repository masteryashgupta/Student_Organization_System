import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ShoppingBag, Search, Filter, Sparkles, Check, AlertTriangle, ArrowRight, Package } from 'lucide-react';
import { useCart } from './CartContext';
import { useAuth } from '../../lib/AuthContext';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import CartDrawer from './CartDrawer';
import api from '../../lib/api';

const CATEGORIES = [
  { id: 'all', label: 'All Merch' },
  { id: 'hoodie', label: 'Hoodies' },
  { id: 'tee', label: 'T-Shirts' },
  { id: 'sweatshirt', label: 'Sweatshirts' },
  { id: 'cap', label: 'Caps & Hats' },
  { id: 'accessory', label: 'Accessories' },
  { id: 'sticker', label: 'Stickers' },
];

export default function ProductCatalogPage() {
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [inStockOnly, setInStockOnly] = useState(false);
  const [sortBy, setSortBy] = useState('newest');

  const { totalItems, openDrawer } = useCart();
  const { isAuthenticated, isOfficer } = useAuth();

  // Fetch live products catalog from API
  const { data: productsData, isLoading, error } = useQuery({
    queryKey: ['products', selectedCategory, searchQuery, inStockOnly, sortBy],
    queryFn: async () => {
      const params = {};
      if (selectedCategory !== 'all') params.type = selectedCategory;
      if (searchQuery.trim()) params.search = searchQuery.trim();
      if (inStockOnly) params.is_active = true;

      const res = await api.get('/products/', { params });
      return res.data?.results || res.data || [];
    },
    staleTime: 1000 * 10, // 10s freshness
  });

  // Client-side sorting
  const products = React.useMemo(() => {
    if (!Array.isArray(productsData)) return [];
    let list = [...productsData];
    if (inStockOnly) {
      list = list.filter((p) => p.is_in_stock && p.total_stock > 0);
    }
    if (sortBy === 'price-low') {
      list.sort((a, b) => Number(a.price) - Number(b.price));
    } else if (sortBy === 'price-high') {
      list.sort((a, b) => Number(b.price) - Number(a.price));
    } else {
      list.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    }
    return list;
  }, [productsData, inStockOnly, sortBy]);

  return (
    <div className="space-y-8 pb-16">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-white border border-border p-6 sm:p-8 shadow-odoo-card">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="max-w-xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#714B67]/10 border border-[#714B67]/20 text-[#714B67] text-xs font-semibold uppercase tracking-wider mb-3">
              <Sparkles className="w-3.5 h-3.5" /> Official Skyline Club Apparel
            </div>
            <h1 className="text-2xl sm:text-4xl font-extrabold text-[#222222] tracking-tight leading-tight">
              Campus Merch & Gear Store
            </h1>
            <p className="text-sm sm:text-base text-[#66636A] mt-2 leading-relaxed">
              High-quality custom club hoodies, t-shirts, and accessories. Active club members receive exclusive tier discounts at checkout.
            </p>
          </div>

          {/* Quick Cart & Order History Buttons */}
          <div className="flex items-center gap-3">
            <Link to="/store/orders">
              <Button variant="secondary" size="md">
                My Orders
              </Button>
            </Link>

            <Button
              variant="primary"
              size="md"
              onClick={openDrawer}
              className="relative shadow-sm bg-[#714B67] hover:bg-[#5B3B52] text-white"
            >
              <ShoppingBag className="w-4 h-4 mr-2" />
              <span>Cart</span>
              {totalItems > 0 && (
                <span className="ml-2 px-2 py-0.5 rounded-full bg-emerald-600 text-white text-xs font-black animate-pulse">
                  {totalItems}
                </span>
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Officer Store Controls (Only visible when relevant to officers/managers) */}
      {isOfficer && (
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-4 bg-brand-50/70 border border-brand-200/80 rounded-2xl shadow-sm">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-brand animate-pulse" />
            <span className="text-xs font-bold text-brand uppercase tracking-wider">
              Store Operations
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-2.5">
            <Link to="/store/manage/orders">
              <Button variant="outline" size="sm" className="bg-white hover:bg-muted border-border">
                <Package className="w-4 h-4 mr-1.5 text-amber-600" />
                Store Orders Desk
              </Button>
            </Link>
            <Link to="/store/manage/inventory">
              <Button variant="outline" size="sm" className="bg-white hover:bg-muted border-border">
                <AlertTriangle className="w-4 h-4 mr-1.5 text-rose-600" />
                Low Stock &amp; Inventory
              </Button>
            </Link>
          </div>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="space-y-4">
        {/* Category Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
          {CATEGORIES.map((cat) => {
            const isSelected = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold whitespace-nowrap transition-all duration-150 ${
                  isSelected
                    ? 'bg-[#714B67] text-white shadow-sm scale-[1.02]'
                    : 'bg-white hover:bg-gray-50 text-[#66636A] border border-border'
                }`}
              >
                {cat.label}
              </button>
            );
          })}
        </div>

        {/* Search, In-Stock Toggle, & Sorting Controls */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-[#F4F6F8] p-3 rounded-2xl border border-border">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-[#66636A] absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search products, hoodies, sizes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white border border-border rounded-xl pl-9 pr-4 py-2 text-xs sm:text-sm text-[#222222] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#714B67]"
            />
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
            <label className="flex items-center gap-2 text-xs font-medium text-[#222222] cursor-pointer select-none">
              <input
                type="checkbox"
                checked={inStockOnly}
                onChange={(e) => setInStockOnly(e.target.checked)}
                className="w-4 h-4 rounded border-border text-[#714B67] accent-[#714B67] focus:ring-[#714B67]"
              />
              <span>In-stock only</span>
            </label>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="bg-white border border-border rounded-xl px-3 py-2 text-xs sm:text-sm text-[#222222] focus:outline-none focus:ring-2 focus:ring-[#714B67]"
            >
              <option value="newest">Newest Arrivals</option>
              <option value="price-low">Price: Low to High</option>
              <option value="price-high">Price: High to Low</option>
            </select>
          </div>
        </div>
      </div>

      {/* Products Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
            <div key={n} className="rounded-2xl bg-white border border-border p-4 space-y-3 animate-pulse shadow-sm">
              <div className="w-full h-52 bg-gray-100 rounded-xl" />
              <div className="h-4 bg-gray-100 rounded w-3/4" />
              <div className="h-4 bg-gray-100 rounded w-1/2" />
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="text-center py-16 bg-white rounded-3xl border border-danger-200 p-6 shadow-sm">
          <AlertTriangle className="w-10 h-10 text-danger-500 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-[#222222]">Unable to Load Catalog</h3>
          <p className="text-sm text-[#66636A] mt-1">Please ensure the backend server is running on localhost:8000.</p>
        </div>
      ) : products.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-3xl border border-border p-8 shadow-sm">
          <Package className="w-12 h-12 text-[#66636A] mx-auto mb-3" />
          <h3 className="text-lg font-bold text-[#222222]">No Products Found</h3>
          <p className="text-sm text-[#66636A] mt-1 max-w-sm mx-auto">
            {searchQuery ? `No merchandise matching "${searchQuery}".` : 'No store merchandise items are currently listed in this category.'}
          </p>
          {(searchQuery || selectedCategory !== 'all') && (
            <Button
              variant="outline"
              size="sm"
              className="mt-4"
              onClick={() => {
                setSearchQuery('');
                setSelectedCategory('all');
              }}
            >
              Reset Filters
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {products.map((product) => {
            const hasStock = product.is_in_stock && product.total_stock > 0;
            const isLowStock = product.total_stock > 0 && product.total_stock <= 5;
            const variants = product.variants || [];

            return (
              <div
                key={product.id}
                className="group relative rounded-2xl bg-white border border-border hover:border-[#714B67]/50 hover:shadow-lg transition-all duration-200 flex flex-col justify-between overflow-hidden shadow-odoo-card"
              >
                {/* Product Image Showcase */}
                <div className="relative h-60 w-full bg-[#F4F6F8] overflow-hidden flex items-center justify-center border-b border-border">
                  {product.image ? (
                    <img
                      src={product.image}
                      alt={product.name}
                      className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center text-[#66636A]">
                      <ShoppingBag className="w-12 h-12 mb-1 opacity-40" />
                      <span className="text-xs font-semibold uppercase tracking-wider">{product.type}</span>
                    </div>
                  )}

                  {/* Badges on Image */}
                  <div className="absolute top-3 left-3 flex flex-col gap-1.5">
                    <Badge variant="accent" size="sm">
                      {product.type_display || product.type?.toUpperCase()}
                    </Badge>
                  </div>

                  {/* Stock Availability Pill */}
                  <div className="absolute top-3 right-3">
                    {!hasStock ? (
                      <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-50 text-rose-800 border border-rose-200 shadow-sm">
                        Sold Out
                      </span>
                    ) : isLowStock ? (
                      <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200 shadow-sm animate-pulse">
                        Only {product.total_stock} left!
                      </span>
                    ) : (
                      <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 shadow-sm">
                        {product.total_stock} in stock
                      </span>
                    )}
                  </div>
                </div>

                {/* Product Content & Size Pills */}
                <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                  <div>
                    <h3 className="text-base font-bold text-[#222222] group-hover:text-[#714B67] transition-colors line-clamp-1">
                      {product.name}
                    </h3>
                    <p className="text-xs text-[#66636A] mt-1 line-clamp-2 leading-relaxed">
                      {product.description || 'Premium official Skyline Club student merchandise.'}
                    </p>
                  </div>

                  {/* Available Sizes Preview */}
                  <div>
                    <span className="text-[11px] font-semibold text-[#66636A] block mb-1.5 uppercase tracking-wider">
                      Sizes & Stock:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {variants.map((v) => {
                        const inStock = v.stock_qty > 0;
                        return (
                          <span
                            key={v.id || v.size}
                            title={`Size ${v.size}: ${v.stock_qty} available`}
                            className={`px-2 py-0.5 rounded-md text-[11px] font-bold transition-all ${
                              inStock
                                ? 'bg-[#F4F6F8] text-[#222222] border border-border'
                                : 'bg-gray-100 text-gray-400 border border-gray-200 line-through opacity-60'
                            }`}
                          >
                            {v.size} {inStock && <span className="text-[9px] text-[#66636A] font-normal">({v.stock_qty})</span>}
                          </span>
                        );
                      })}
                    </div>
                  </div>

                  {/* Price & Action */}
                  <div className="pt-3 border-t border-border flex items-center justify-between">
                    <div>
                      <span className="text-xs text-[#66636A] block">Retail Price</span>
                      <span className="text-lg font-black text-[#222222]">${Number(product.price).toFixed(2)}</span>
                    </div>

                    <Link to={`/store/${product.id}`}>
                      <Button
                        variant={hasStock ? 'primary' : 'outline'}
                        size="sm"
                        className={`group-hover:translate-x-0.5 transition-transform ${hasStock ? 'bg-[#714B67] hover:bg-[#5B3B52] text-white shadow-sm' : ''}`}
                      >
                        <span>{hasStock ? 'Select Size' : 'View Item'}</span>
                        <ArrowRight className="w-3.5 h-3.5 ml-1" />
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Cart Drawer Component */}
      <CartDrawer />
    </div>
  );
}
