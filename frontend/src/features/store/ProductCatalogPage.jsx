import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ShoppingBag, Search, Filter, Sparkles, Check, AlertTriangle, ArrowRight, Package } from 'lucide-react';
import { useCart } from './CartContext';
import { useAuth } from '../../lib/AuthContext';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import CartDrawer from './CartDrawer';
import api from '../../lib/api';

const CATEGORIES = [
  { id: 'all', label: 'All Merch' },
  { id: 'hoodie', label: 'Hoodies' },
  { id: 'tee', label: 'T-Shirts' },
  { id: 'cap', label: 'Caps & Hats' },
  { id: 'accessory', label: 'Accessories' },
  { id: 'sticker', label: 'Stickers' },
];

function ProductCardImage({ src, name, type }) {
  const [imgError, setImgError] = useState(false);

  if (!src || imgError) {
    return (
      <div className="w-full h-full bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-900 flex flex-col items-center justify-center text-slate-500 dark:text-slate-400 p-4 text-center select-none">
        <div className="w-14 h-14 rounded-2xl bg-white/80 dark:bg-slate-800/80 shadow-sm flex items-center justify-center mb-2">
          <ShoppingBag className="w-7 h-7 text-[#714B67] dark:text-purple-400" />
        </div>
        <span className="text-xs font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-200 line-clamp-1">{name}</span>
        <span className="text-[10px] font-semibold text-slate-400 uppercase mt-0.5">{type}</span>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={name}
      onError={() => setImgError(true)}
      className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500"
    />
  );
}

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
    <div className="space-y-8 pb-16 animate-fadeIn">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-3xl glass-panel border-white/40 dark:border-slate-800/80 p-6 sm:p-10 shadow-xl">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="max-w-xl">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-purple-500/10 dark:bg-purple-500/20 border border-purple-500/30 text-[#714B67] dark:text-purple-300 text-xs font-bold uppercase tracking-wider mb-3 shadow-sm">
              <Sparkles className="w-3.5 h-3.5" /> Official Skyline Club Apparel
            </div>
            <h1 className="text-2xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight leading-tight">
              Campus Merch & Gear Store
            </h1>
            <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 mt-2 leading-relaxed">
              High-quality custom club hoodies, t-shirts, and accessories. Active club members receive exclusive tier discounts at checkout.
            </p>
          </div>

          {/* Quick Cart & Order History Buttons */}
          <div className="flex items-center gap-3 shrink-0">
            <Link to="/store/orders" className="shrink-0">
              <Button variant="secondary" size="md" className="px-5 py-2.5 text-sm font-semibold rounded-full border-slate-200/80 dark:border-slate-700/80">
                My Orders
              </Button>
            </Link>

            <button
              type="button"
              onClick={openDrawer}
              className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full text-sm font-bold bg-gradient-to-r from-[#714B67] to-[#8C5D80] hover:from-[#5B3B52] hover:to-[#714B67] text-white shadow-lg shadow-purple-500/20 transition-all duration-150 active:scale-95 shrink-0"
            >
              <ShoppingBag className="w-4 h-4 shrink-0" />
              <span>Cart</span>
              {totalItems > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-emerald-500 text-white text-xs font-black shrink-0 shadow-sm">
                  {totalItems}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Officer Store Controls (Only visible when relevant to officers/managers) */}
      {isOfficer && (
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-4 glass-card bg-purple-500/10 border border-purple-500/20 dark:border-purple-500/30 rounded-2xl shadow-sm">
          <div className="flex items-center gap-2.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#714B67] dark:bg-purple-400 animate-pulse shadow-sm" />
            <span className="text-xs font-bold text-[#714B67] dark:text-purple-300 uppercase tracking-wider">
              Store Operations
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-2.5">
            <Link to="/store/manage/orders">
              <Button variant="outline" size="sm" className="bg-white/80 dark:bg-slate-900/80 text-slate-800 dark:text-slate-200 border-slate-200/80 dark:border-slate-700/80 rounded-full font-medium">
                <Package className="w-4 h-4 mr-1.5 text-amber-500" />
                <span>Store Orders Desk</span>
              </Button>
            </Link>
            <Link to="/store/manage/inventory">
              <Button variant="outline" size="sm" className="bg-white/80 dark:bg-slate-900/80 text-slate-800 dark:text-slate-200 border-slate-200/80 dark:border-slate-700/80 rounded-full font-medium">
                <AlertTriangle className="w-4 h-4 mr-1.5 text-rose-500" />
                <span>Low Stock &amp; Inventory</span>
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
                className={`px-4 py-2 rounded-full text-xs sm:text-sm font-bold whitespace-nowrap transition-all duration-200 ${
                  isSelected
                    ? 'bg-gradient-to-r from-[#714B67] to-[#8C5D80] text-white shadow-md shadow-purple-500/20 scale-[1.02]'
                    : 'glass-card bg-white/70 dark:bg-slate-900/70 hover:bg-white dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200/80 dark:border-slate-800/80'
                }`}
              >
                {cat.label}
              </button>
            );
          })}
        </div>

        {/* Search, In-Stock Toggle, & Sorting Controls */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 glass-card bg-slate-100/70 dark:bg-slate-900/60 p-3 rounded-2xl border border-slate-200/80 dark:border-slate-800/80">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search products, hoodies, sizes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white/80 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80 rounded-xl pl-9 pr-4 py-2 text-xs sm:text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#714B67] dark:focus:ring-purple-400 transition-all"
            />
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
            <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={inStockOnly}
                onChange={(e) => setInStockOnly(e.target.checked)}
                className="w-4 h-4 rounded border-slate-300 dark:border-slate-700 text-[#714B67] accent-[#714B67] focus:ring-[#714B67]"
              />
              <span>In-stock only</span>
            </label>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="bg-white/80 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80 rounded-xl px-3 py-2 text-xs sm:text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#714B67] dark:focus:ring-purple-400 font-medium"
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <div key={n} className="rounded-3xl glass-card bg-slate-100/50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800/60 p-5 space-y-4 animate-pulse shadow-md">
              <div className="w-full h-56 bg-slate-200/60 dark:bg-slate-700/60 rounded-2xl" />
              <div className="h-5 bg-slate-200/60 dark:bg-slate-700/60 rounded-lg w-3/4" />
              <div className="h-4 bg-slate-200/60 dark:bg-slate-700/60 rounded-lg w-1/2" />
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="text-center py-16 glass-panel rounded-3xl border border-rose-300/40 dark:border-rose-900/50 p-8 shadow-xl">
          <AlertTriangle className="w-10 h-10 text-rose-500 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">Unable to Load Catalog</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Please ensure the backend server is running on localhost:8000.</p>
        </div>
      ) : products.length === 0 ? (
        <div className="text-center py-20 glass-panel rounded-3xl border border-white/40 dark:border-slate-800/80 p-8 shadow-xl">
          <Package className="w-12 h-12 text-slate-400 mx-auto mb-3" />
          <h3 className="text-xl font-bold text-slate-900 dark:text-white">No Products Found</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
            {searchQuery ? `No merchandise matching "${searchQuery}".` : 'No store merchandise items are currently listed in this category.'}
          </p>
          {(searchQuery || selectedCategory !== 'all') && (
            <Button
              variant="outline"
              size="sm"
              className="mt-5 rounded-full px-6"
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {products.map((product) => {
            const hasStock = product.is_in_stock && product.total_stock > 0;
            const isLowStock = product.total_stock > 0 && product.total_stock <= 5;
            const variants = product.variants || [];

            return (
              <div
                key={product.id}
                className="group relative rounded-3xl glass-card bg-white/70 dark:bg-slate-900/70 border border-slate-200/80 dark:border-slate-800/80 hover:border-purple-300 dark:hover:border-purple-700 hover:shadow-2xl transition-all duration-300 flex flex-col justify-between overflow-hidden shadow-lg backdrop-blur-xl"
              >
                {/* Product Image Showcase */}
                <div className="relative h-64 w-full bg-slate-100/70 dark:bg-slate-800/60 overflow-hidden flex items-center justify-center border-b border-slate-200/60 dark:border-slate-800/60">
                  <ProductCardImage src={product.image} name={product.name} type={product.type} />

                  {/* Badges on Image */}
                  <div className="absolute top-3.5 left-3.5 z-10 flex flex-col gap-1.5">
                    <Badge variant="accent" size="sm" className="rounded-full px-3 shadow-md">
                      {product.type_display || product.type?.toUpperCase()}
                    </Badge>
                  </div>

                  {/* Stock Availability Pill */}
                  <div className="absolute top-3.5 right-3.5 z-10">
                    {!hasStock ? (
                      <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-rose-500/20 text-rose-700 dark:text-rose-300 border border-rose-300/40 dark:border-rose-800/50 shadow-md backdrop-blur-md">
                        Sold Out
                      </span>
                    ) : isLowStock ? (
                      <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-amber-500/20 text-amber-800 dark:text-amber-200 border border-amber-300/40 dark:border-amber-800/50 shadow-md backdrop-blur-md animate-pulse">
                        Only {product.total_stock} left!
                      </span>
                    ) : (
                      <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-emerald-500/20 text-emerald-800 dark:text-emerald-200 border border-emerald-300/40 dark:border-emerald-800/50 shadow-md backdrop-blur-md">
                        {product.total_stock} in stock
                      </span>
                    )}
                  </div>
                </div>

                {/* Product Content & Size Pills */}
                <div className="p-6 flex-1 flex flex-col justify-between space-y-4">
                  <div>
                    <h3 className="text-lg font-extrabold text-slate-900 dark:text-white group-hover:text-[#714B67] dark:group-hover:text-purple-300 transition-colors line-clamp-1">
                      {product.name}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                      {product.description || 'Premium official Skyline Club student merchandise.'}
                    </p>
                  </div>

                  {/* Available Sizes Preview */}
                  <div>
                    <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 block mb-2 uppercase tracking-wider">
                      Sizes & Stock:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {variants.map((v) => {
                        const inStock = v.stock_qty > 0;
                        return (
                          <span
                            key={v.id || v.size}
                            title={`Size ${v.size}: ${v.stock_qty} available`}
                            className={`px-3 py-1 rounded-xl text-[11px] font-bold transition-all ${
                              inStock
                                ? 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 shadow-sm'
                                : 'bg-slate-100/50 dark:bg-slate-800/30 text-slate-400 dark:text-slate-600 border border-slate-200/50 dark:border-slate-800/50 line-through opacity-50'
                            }`}
                          >
                            {v.size} {inStock && <span className="text-[9px] text-slate-400 font-normal">({v.stock_qty})</span>}
                          </span>
                        );
                      })}
                    </div>
                  </div>

                  {/* Price & Action */}
                  <div className="pt-4 border-t border-slate-200/60 dark:border-slate-800/60 flex items-center justify-between">
                    <div>
                      <span className="text-xs text-slate-400 font-medium block">Retail Price</span>
                      <span className="text-xl font-black text-slate-900 dark:text-white">${Number(product.price).toFixed(2)}</span>
                    </div>

                    <Link to={`/store/${product.id}`}>
                      <Button
                        variant={hasStock ? 'primary' : 'outline'}
                        size="md"
                        className={`group-hover:translate-x-0.5 transition-transform px-5 py-2.5 rounded-full font-bold ${
                          hasStock
                            ? 'bg-gradient-to-r from-[#714B67] to-[#8C5D80] hover:from-[#5B3B52] hover:to-[#714B67] text-white shadow-md shadow-purple-500/20'
                            : 'rounded-full'
                        }`}
                      >
                        <span>{hasStock ? 'Select Size' : 'View Item'}</span>
                        <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
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
