import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ShieldCheck,
  AlertTriangle,
  Package,
  PlusCircle,
  RefreshCw,
  Search,
  CheckCircle2,
  TrendingDown,
  Layers,
  ArrowLeft,
  Boxes,
  Zap,
} from 'lucide-react';
import { useAuth } from '../../lib/AuthContext';
import { useToast } from '../../components/ui/Toast';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Input } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
import api from '../../lib/api';

export default function OfficerInventoryPage() {
  const { isOfficer } = useAuth();
  const toast = useToast();
  const queryClient = useQueryClient();

  const [searchQuery, setSearchQuery] = useState('');
  const [stockFilter, setStockFilter] = useState('all'); // 'all', 'low', 'out', 'healthy'
  const [typeFilter, setTypeFilter] = useState('all');
  const [restockItem, setRestockItem] = useState(null); // { variant, product }
  const [restockQty, setRestockQty] = useState(10);

  // Fetch all products with their variants
  const { data: products = [], isLoading, isFetching, refetch } = useQuery({
    queryKey: ['officerProductsInventory'],
    queryFn: async () => {
      const res = await api.get('/products/');
      return res.data?.results || res.data || [];
    },
    staleTime: 1000 * 10,
  });

  // Flatten product variants for granular SKU inventory tracking
  const flattenedInventory = useMemo(() => {
    const list = [];
    products.forEach((prod) => {
      const variants = prod.variants && prod.variants.length > 0
        ? prod.variants
        : [{ id: `prod-${prod.id}`, size: 'STANDARD', stock_qty: prod.stock_qty || 0, is_in_stock: (prod.stock_qty || 0) > 0 }];

      variants.forEach((v) => {
        list.push({
          variantId: v.id,
          productId: prod.id,
          productName: prod.name,
          productType: prod.type || 'merch',
          price: Number(prod.price || 0),
          imageUrl: prod.image_url,
          size: v.size || 'STD',
          stock_qty: v.stock_qty,
          is_in_stock: v.stock_qty > 0,
          sku: v.sku || `SKU-${prod.id}-${v.size || 'STD'}`,
          product: prod,
          variant: v,
        });
      });
    });
    return list;
  }, [products]);

  // Inventory KPI Metrics
  const stats = useMemo(() => {
    const totalSKUs = flattenedInventory.length;
    const lowStockCount = flattenedInventory.filter((i) => i.stock_qty > 0 && i.stock_qty <= 5).length;
    const outOfStockCount = flattenedInventory.filter((i) => i.stock_qty === 0).length;
    const healthyCount = flattenedInventory.filter((i) => i.stock_qty > 5).length;
    const totalUnits = flattenedInventory.reduce((sum, i) => sum + i.stock_qty, 0);
    const totalAssetValue = flattenedInventory.reduce((sum, i) => sum + i.stock_qty * i.price, 0);

    return {
      totalSKUs,
      lowStockCount,
      outOfStockCount,
      healthyCount,
      totalUnits,
      totalAssetValue,
    };
  }, [flattenedInventory]);

  // Filtered List
  const filteredInventory = useMemo(() => {
    return flattenedInventory.filter((item) => {
      // Stock Health Filter
      if (stockFilter === 'low' && (item.stock_qty <= 0 || item.stock_qty > 5)) return false;
      if (stockFilter === 'out' && item.stock_qty !== 0) return false;
      if (stockFilter === 'healthy' && item.stock_qty <= 5) return false;

      // Product Type Filter
      if (typeFilter !== 'all' && item.productType.toLowerCase() !== typeFilter.toLowerCase()) return false;

      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = item.productName.toLowerCase().includes(q);
        const matchesSku = item.sku.toLowerCase().includes(q);
        const matchesSize = item.size.toLowerCase().includes(q);
        if (!matchesName && !matchesSku && !matchesSize) return false;
      }

      return true;
    });
  }, [flattenedInventory, stockFilter, typeFilter, searchQuery]);

  // Restock Mutation
  const restockMutation = useMutation({
    mutationFn: async ({ productId, variantId, size, quantity }) => {
      const payload = { quantity: Number(quantity) };
      if (typeof variantId === 'number') {
        payload.variant_id = variantId;
      } else if (size) {
        payload.size = size;
      }
      const res = await api.post(`/products/${productId}/restock/`, payload);
      return res.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['officerProductsInventory'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['productVariants'] });
      toast.success(data.message || 'Inventory restocked successfully!');
      setRestockItem(null);
      setRestockQty(10);
    },
    onError: (err) => {
      const msg = err.response?.data?.message || err.response?.data?.detail || 'Failed to restock inventory.';
      toast.error(msg);
    },
  });

  const handleOpenRestock = (item) => {
    setRestockItem(item);
    setRestockQty(10);
  };

  const handleConfirmRestock = () => {
    if (!restockItem || restockQty <= 0) {
      toast.error('Please enter a valid restock quantity greater than 0.');
      return;
    }
    restockMutation.mutate({
      productId: restockItem.productId,
      variantId: typeof restockItem.variantId === 'number' ? restockItem.variantId : null,
      size: restockItem.size,
      quantity: restockQty,
    });
  };

  return (
    <div className="max-w-7xl mx-auto pb-24 space-y-8 animate-fadeIn">
      {/* Top Header & Breadcrumb */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/60 dark:border-slate-800/60 pb-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Badge variant="accent" className="flex items-center gap-1.5 px-3.5 py-1 font-bold rounded-full">
              <ShieldCheck className="w-3.5 h-3.5" /> Officer Control Desk
            </Badge>
            <span className="text-slate-400">/</span>
            <Link to="/store" className="text-xs font-bold text-slate-500 hover:text-brand-600 dark:text-slate-400 dark:hover:text-brand-300 flex items-center gap-1 transition-colors">
              <ArrowLeft className="w-3 h-3" /> Live Store
            </Link>
          </div>
          <h1 className="text-2xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-2.5">
            Merch Stock & Low-Stock Alerts
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Real-time per-size stock monitoring, automated replenishment alerts (&le; 5 units), and instant SKU restock.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link to="/store/manage/orders">
            <Button variant="outline" size="sm" className="font-bold rounded-full border-slate-200/80 dark:border-slate-700/80 hover:bg-slate-100 dark:hover:bg-slate-800">
              <Boxes className="w-4 h-4 mr-1.5 text-brand-600 dark:text-brand-400" /> Order Fulfillment Desk
            </Button>
          </Link>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => refetch()}
            disabled={isFetching}
            className="rounded-full text-slate-500 hover:text-slate-900 dark:hover:text-white"
          >
            <RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin text-brand-600 dark:text-brand-400' : ''}`} />
          </Button>
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Total SKUs */}
        <div className="glass-panel border-white/40 dark:border-slate-800/80 p-6 rounded-3xl shadow-lg">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Active SKUs</span>
            <Layers className="w-4 h-4 text-brand-600 dark:text-brand-400" />
          </div>
          <div className="text-3xl font-black text-slate-900 dark:text-white">{stats.totalSKUs}</div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Across {products.length} catalog products</p>
        </div>

        {/* Low Stock Alert (<= 5) */}
        <div
          onClick={() => setStockFilter(stockFilter === 'low' ? 'all' : 'low')}
          className={`cursor-pointer transition-all border p-6 rounded-3xl shadow-lg backdrop-blur-xl ${
            stats.lowStockCount > 0
              ? 'bg-amber-500/10 border-amber-300/40 dark:border-amber-700/50 hover:border-amber-400'
              : 'glass-panel border-white/40 dark:border-slate-800/80'
          }`}
        >
          <div className="flex items-center justify-between text-amber-800 dark:text-amber-300 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider flex items-center gap-1">
              <AlertTriangle className="w-3.5 h-3.5" /> Low Stock (&le; 5)
            </span>
            <span className="text-xs font-bold bg-amber-500/20 text-amber-800 dark:text-amber-200 px-2.5 py-0.5 rounded-full border border-amber-500/30">
              {stats.lowStockCount}
            </span>
          </div>
          <div className="text-3xl font-black text-amber-600 dark:text-amber-400">{stats.lowStockCount}</div>
          <p className="text-xs text-amber-800/80 dark:text-amber-300/80 mt-1">Requires replenishment</p>
        </div>

        {/* Out of Stock (0) */}
        <div
          onClick={() => setStockFilter(stockFilter === 'out' ? 'all' : 'out')}
          className={`cursor-pointer transition-all border p-6 rounded-3xl shadow-lg backdrop-blur-xl ${
            stats.outOfStockCount > 0
              ? 'bg-rose-500/10 border-rose-300/40 dark:border-rose-800/50 hover:border-rose-400'
              : 'glass-panel border-white/40 dark:border-slate-800/80'
          }`}
        >
          <div className="flex items-center justify-between text-rose-800 dark:text-rose-300 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider flex items-center gap-1">
              <TrendingDown className="w-3.5 h-3.5" /> Out of Stock (0)
            </span>
            <span className="text-xs font-bold bg-rose-500/20 text-rose-800 dark:text-rose-200 px-2.5 py-0.5 rounded-full border border-rose-500/30">
              {stats.outOfStockCount}
            </span>
          </div>
          <div className="text-3xl font-black text-rose-600 dark:text-rose-400">{stats.outOfStockCount}</div>
          <p className="text-xs text-rose-800/80 dark:text-rose-300/80 mt-1">Buying currently disabled</p>
        </div>

        {/* Total Units in Stock */}
        <div className="glass-panel border-white/40 dark:border-slate-800/80 p-6 rounded-3xl shadow-lg">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Total Units on Hand</span>
            <Package className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="text-3xl font-black text-emerald-600 dark:text-emerald-400">{stats.totalUnits}</div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            ${stats.totalAssetValue.toFixed(2)} retail inventory
          </p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="glass-card bg-slate-100/70 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800/80 p-4 rounded-2xl shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Status Filter Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
          <button
            type="button"
            onClick={() => setStockFilter('all')}
            className={`px-4 py-2 rounded-full text-xs font-bold transition-all whitespace-nowrap ${
              stockFilter === 'all'
                ? 'bg-gradient-to-r from-brand-600 to-indigo-600 text-white shadow-md shadow-brand-500/20'
                : 'glass-card bg-white/70 dark:bg-slate-900/70 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white border border-slate-200/80 dark:border-slate-800/80'
            }`}
          >
            All SKUs ({flattenedInventory.length})
          </button>
          <button
            type="button"
            onClick={() => setStockFilter('low')}
            className={`px-4 py-2 rounded-full text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
              stockFilter === 'low'
                ? 'bg-amber-600 text-white shadow-md shadow-amber-500/20'
                : 'bg-amber-500/10 text-amber-800 dark:text-amber-200 border border-amber-300/40 dark:border-amber-700/50'
            }`}
          >
            <AlertTriangle className="w-3 h-3" />
            Low Stock ({stats.lowStockCount})
          </button>
          <button
            type="button"
            onClick={() => setStockFilter('out')}
            className={`px-4 py-2 rounded-full text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
              stockFilter === 'out'
                ? 'bg-rose-600 text-white shadow-md shadow-rose-500/20'
                : 'bg-rose-500/10 text-rose-800 dark:text-rose-200 border border-rose-300/40 dark:border-rose-800/50'
            }`}
          >
            <TrendingDown className="w-3 h-3" />
            Out of Stock ({stats.outOfStockCount})
          </button>
          <button
            type="button"
            onClick={() => setStockFilter('healthy')}
            className={`px-4 py-2 rounded-full text-xs font-bold transition-all whitespace-nowrap ${
              stockFilter === 'healthy'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-500/20'
                : 'bg-emerald-500/10 text-emerald-800 dark:text-emerald-200 border border-emerald-300/40 dark:border-emerald-700/50'
            }`}
          >
            Healthy ({stats.healthyCount})
          </button>
        </div>

        {/* Search Input */}
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search SKU, Product, or Size..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs bg-white/80 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500 dark:focus:ring-brand-400 transition-all font-medium"
          />
        </div>
      </div>

      {/* Inventory Table */}
      <div className="glass-panel border-white/40 dark:border-slate-800/80 rounded-3xl overflow-hidden shadow-2xl">
        {isLoading ? (
          <div className="p-12 text-center space-y-3">
            <div className="w-8 h-8 border-2 border-brand-600 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs text-slate-400">Loading live stock levels from inventory database...</p>
          </div>
        ) : filteredInventory.length === 0 ? (
          <div className="p-16 text-center space-y-3">
            <CheckCircle2 className="w-12 h-12 text-emerald-600 dark:text-emerald-400 mx-auto opacity-70" />
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">No Inventory Issues Found</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
              {stockFilter === 'low'
                ? 'Great news! No merchandise items are currently under the 5-unit low stock threshold.'
                : stockFilter === 'out'
                ? 'All sizes and variants are currently in stock!'
                : 'No products match your current search and filter criteria.'}
            </p>
            {(stockFilter !== 'all' || searchQuery) && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setStockFilter('all');
                  setSearchQuery('');
                }}
                className="rounded-full px-5"
              >
                Clear Filters
              </Button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200/60 dark:border-slate-800/60 bg-slate-50/50 dark:bg-slate-900/50 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  <th className="py-4 px-5">Product / SKU</th>
                  <th className="py-4 px-5">Category</th>
                  <th className="py-4 px-5 text-center">Variant / Size</th>
                  <th className="py-4 px-5">Unit Price</th>
                  <th className="py-4 px-5">Stock Health</th>
                  <th className="py-4 px-5 text-center">Units on Hand</th>
                  <th className="py-4 px-5 text-right">Quick Restock</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                {filteredInventory.map((item) => {
                  const isZero = item.stock_qty === 0;
                  const isLow = item.stock_qty > 0 && item.stock_qty <= 5;

                  return (
                    <tr
                      key={`${item.productId}-${item.variantId}-${item.size}`}
                      className={`hover:bg-brand-500/5 dark:hover:bg-brand-500/10 transition-colors ${
                        isZero
                          ? 'bg-rose-500/5'
                          : isLow
                          ? 'bg-amber-500/5'
                          : ''
                      }`}
                    >
                      {/* Product Name & Thumbnail */}
                      <td className="py-4 px-5">
                        <div className="flex items-center gap-3">
                          <div className="w-11 h-11 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700/60 overflow-hidden flex-shrink-0 flex items-center justify-center text-slate-400">
                            {item.imageUrl ? (
                              <img src={item.imageUrl} alt={item.productName} className="w-full h-full object-cover" />
                            ) : (
                              <Package className="w-5 h-5 text-slate-400" />
                            )}
                          </div>
                          <div>
                            <Link
                              to={`/store/${item.productId}`}
                              className="font-bold text-slate-900 dark:text-white hover:text-brand-600 dark:hover:text-brand-300 transition-colors line-clamp-1"
                            >
                              {item.productName}
                            </Link>
                            <span className="text-[10px] font-mono text-slate-400 block">
                              {item.sku}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Category */}
                      <td className="py-4 px-5">
                        <span className="capitalize text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700/60 px-2.5 py-1 rounded-lg text-[11px] font-semibold">
                          {item.productType}
                        </span>
                      </td>

                      {/* Size */}
                      <td className="py-4 px-5 text-center">
                        <span className="inline-block px-3 py-1 bg-slate-100 dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700/60 font-mono font-bold text-slate-900 dark:text-white rounded-lg text-xs">
                          {item.size}
                        </span>
                      </td>

                      {/* Unit Price */}
                      <td className="py-4 px-5 font-bold text-slate-900 dark:text-white">
                        ${item.price.toFixed(2)}
                      </td>

                      {/* Stock Health Status */}
                      <td className="py-4 px-5">
                        {isZero ? (
                          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[11px] font-bold bg-rose-500/20 text-rose-800 dark:text-rose-200 border border-rose-300/40 dark:border-rose-800/50">
                            <TrendingDown className="w-3 h-3" /> Out of Stock
                          </span>
                        ) : isLow ? (
                          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[11px] font-bold bg-amber-500/20 text-amber-800 dark:text-amber-200 border border-amber-300/40 dark:border-amber-800/50">
                            <AlertTriangle className="w-3 h-3" /> Low Stock (&le; 5)
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[11px] font-bold bg-emerald-500/20 text-emerald-800 dark:text-emerald-200 border border-emerald-300/40 dark:border-emerald-700/50">
                            <CheckCircle2 className="w-3 h-3" /> Healthy
                          </span>
                        )}
                      </td>

                      {/* Units on Hand */}
                      <td className="py-4 px-5 text-center">
                        <span
                          className={`font-mono text-base font-black ${
                            isZero
                              ? 'text-rose-600 dark:text-rose-400'
                              : isLow
                              ? 'text-amber-600 dark:text-amber-400'
                              : 'text-slate-900 dark:text-white'
                          }`}
                        >
                          {item.stock_qty}
                        </span>
                      </td>

                      {/* Restock Action Button */}
                      <td className="py-4 px-5 text-right">
                        <Button
                          variant={isZero ? 'danger' : isLow ? 'warning' : 'outline'}
                          size="sm"
                          onClick={() => handleOpenRestock(item)}
                          className="h-8 text-xs font-bold rounded-full px-4"
                        >
                          <PlusCircle className="w-3.5 h-3.5 mr-1" /> Restock
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Restock Inventory Modal */}
      {restockItem && (
        <Modal
          isOpen={true}
          onClose={() => setRestockItem(null)}
          title={`Restock: ${restockItem.productName}`}
        >
          <div className="space-y-5 p-1 text-xs">
            <div className="glass-card bg-slate-50/70 dark:bg-slate-800/60 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 space-y-2.5">
              <div className="flex justify-between">
                <span className="text-slate-500 dark:text-slate-400">Variant Size:</span>
                <span className="font-bold text-slate-900 dark:text-white font-mono bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 px-2.5 py-0.5 rounded-md">
                  {restockItem.size}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 dark:text-slate-400">Current Stock Level:</span>
                <span
                  className={`font-bold font-mono ${
                    restockItem.stock_qty === 0 ? 'text-rose-600 dark:text-rose-400' : 'text-amber-600 dark:text-amber-400'
                  }`}
                >
                  {restockItem.stock_qty} unit(s)
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 dark:text-slate-400">SKU Code:</span>
                <span className="font-mono text-slate-900 dark:text-white font-semibold">{restockItem.sku}</span>
              </div>
            </div>

            {/* Quantity Input */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                Units to Add
              </label>
              <Input
                type="number"
                min="1"
                step="1"
                value={restockQty}
                onChange={(e) => setRestockQty(Math.max(1, parseInt(e.target.value) || 1))}
                placeholder="Enter replenishment units..."
              />
              <div className="flex items-center gap-2 pt-1">
                {[5, 10, 25, 50].map((quickAmount) => (
                  <button
                    key={quickAmount}
                    type="button"
                    onClick={() => setRestockQty(quickAmount)}
                    className={`text-xs px-3 py-1.5 rounded-xl border font-bold transition-all ${
                      restockQty === quickAmount
                        ? 'bg-brand-600 border-brand-600 text-white shadow-sm'
                        : 'glass-card bg-slate-100/70 dark:bg-slate-800/60 border-slate-200/80 dark:border-slate-700/80 text-slate-600 dark:text-slate-300 hover:text-slate-900'
                    }`}
                  >
                    +{quickAmount}
                  </button>
                ))}
              </div>
            </div>

            {/* Restock Summary */}
            <div className="p-3.5 bg-brand-500/10 border border-brand-500/20 rounded-2xl text-xs text-brand-600 dark:text-brand-300 flex items-center gap-2.5">
              <Zap className="w-4 h-4 text-brand-600 dark:text-brand-300 flex-shrink-0" />
              <span>
                New resulting stock after replenishment will be{' '}
                <strong className="text-slate-900 dark:text-white font-mono">
                  {restockItem.stock_qty + Number(restockQty || 0)} units
                </strong>
                .
              </span>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-200/60 dark:border-slate-800/60">
              <Button
                variant="ghost"
                onClick={() => setRestockItem(null)}
                disabled={restockMutation.isPending}
                className="rounded-full text-slate-500"
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleConfirmRestock}
                disabled={restockMutation.isPending}
                className="rounded-full bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 text-white font-bold"
              >
                {restockMutation.isPending ? 'Restocking...' : `Confirm +${restockQty} Units`}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
