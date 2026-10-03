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
  Filter,
  CheckCircle2,
  TrendingDown,
  Layers,
  ArrowLeft,
  DollarSign,
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Badge variant="accent" className="flex items-center gap-1.5 px-3 py-1 font-semibold">
              <ShieldCheck className="w-3.5 h-3.5 text-brand-400" /> Officer Control Desk
            </Badge>
            <span className="text-slate-600">/</span>
            <Link to="/store" className="text-xs font-semibold text-slate-400 hover:text-brand-400 flex items-center gap-1">
              <ArrowLeft className="w-3 h-3" /> Live Store
            </Link>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center gap-2.5">
            Merch Stock & Low-Stock Alerts
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Real-time per-size stock monitoring, automated replenishment alerts (&le; 5 units), and instant SKU restock.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link to="/store/manage/orders">
            <Button variant="outline" size="sm" className="font-semibold">
              <Boxes className="w-4 h-4 mr-1.5 text-brand-400" /> Order Fulfillment Desk
            </Button>
          </Link>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => refetch()}
            disabled={isFetching}
            className="text-slate-400 hover:text-white"
          >
            <RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin text-brand-400' : ''}`} />
          </Button>
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Total SKUs */}
        <div className="bg-surface-900/90 border border-slate-800 p-5 rounded-2xl relative overflow-hidden backdrop-blur-md">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Active SKUs</span>
            <Layers className="w-4 h-4 text-brand-400" />
          </div>
          <div className="text-3xl font-black text-white">{stats.totalSKUs}</div>
          <p className="text-xs text-slate-400 mt-1">Across {products.length} catalog products</p>
        </div>

        {/* Low Stock Alert (<= 5) */}
        <div
          onClick={() => setStockFilter(stockFilter === 'low' ? 'all' : 'low')}
          className={`cursor-pointer transition-all border p-5 rounded-2xl relative overflow-hidden backdrop-blur-md ${
            stats.lowStockCount > 0
              ? 'bg-amber-950/20 border-amber-500/40 hover:border-amber-400 hover:shadow-lg hover:shadow-amber-500/10'
              : 'bg-surface-900/90 border-slate-800'
          }`}
        >
          <div className="flex items-center justify-between text-amber-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider flex items-center gap-1">
              <AlertTriangle className="w-3.5 h-3.5" /> Low Stock (&le; 5)
            </span>
            <span className="text-xs font-bold bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-full">
              {stats.lowStockCount}
            </span>
          </div>
          <div className="text-3xl font-black text-amber-300">{stats.lowStockCount}</div>
          <p className="text-xs text-amber-400/80 mt-1">Requires immediate restocking</p>
        </div>

        {/* Out of Stock (0) */}
        <div
          onClick={() => setStockFilter(stockFilter === 'out' ? 'all' : 'out')}
          className={`cursor-pointer transition-all border p-5 rounded-2xl relative overflow-hidden backdrop-blur-md ${
            stats.outOfStockCount > 0
              ? 'bg-rose-950/20 border-rose-500/40 hover:border-rose-400 hover:shadow-lg hover:shadow-rose-500/10'
              : 'bg-surface-900/90 border-slate-800'
          }`}
        >
          <div className="flex items-center justify-between text-rose-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider flex items-center gap-1">
              <TrendingDown className="w-3.5 h-3.5" /> Out of Stock (0)
            </span>
            <span className="text-xs font-bold bg-rose-500/20 text-rose-300 px-2 py-0.5 rounded-full">
              {stats.outOfStockCount}
            </span>
          </div>
          <div className="text-3xl font-black text-rose-400">{stats.outOfStockCount}</div>
          <p className="text-xs text-rose-400/80 mt-1">Buying currently disabled</p>
        </div>

        {/* Total Units in Stock */}
        <div className="bg-surface-900/90 border border-slate-800 p-5 rounded-2xl relative overflow-hidden backdrop-blur-md">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Total Units on Hand</span>
            <Package className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-3xl font-black text-emerald-400">{stats.totalUnits}</div>
          <p className="text-xs text-slate-400 mt-1">
            ${stats.totalAssetValue.toFixed(2)} retail inventory
          </p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-surface-900 border border-slate-800 p-4 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Status Filter Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
          <button
            onClick={() => setStockFilter('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
              stockFilter === 'all'
                ? 'bg-brand-600 text-white shadow-md shadow-brand-600/30'
                : 'bg-surface-800/80 text-slate-400 hover:text-white hover:bg-surface-700'
            }`}
          >
            All SKUs ({flattenedInventory.length})
          </button>
          <button
            onClick={() => setStockFilter('low')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
              stockFilter === 'low'
                ? 'bg-amber-600 text-white shadow-md shadow-amber-600/30'
                : 'bg-amber-500/10 text-amber-400 hover:bg-amber-500/20'
            }`}
          >
            <AlertTriangle className="w-3 h-3" />
            Low Stock ({stats.lowStockCount})
          </button>
          <button
            onClick={() => setStockFilter('out')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
              stockFilter === 'out'
                ? 'bg-rose-600 text-white shadow-md shadow-rose-600/30'
                : 'bg-rose-500/10 text-rose-400 hover:bg-rose-500/20'
            }`}
          >
            <TrendingDown className="w-3 h-3" />
            Out of Stock ({stats.outOfStockCount})
          </button>
          <button
            onClick={() => setStockFilter('healthy')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
              stockFilter === 'healthy'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
                : 'bg-surface-800/80 text-slate-400 hover:text-white hover:bg-surface-700'
            }`}
          >
            Healthy ({stats.healthyCount})
          </button>
        </div>

        {/* Search Input */}
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            placeholder="Search SKU, Product, or Size..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-1.5 text-xs bg-surface-950 border border-slate-700/80 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-brand-500 transition-colors"
          />
        </div>
      </div>

      {/* Inventory Table */}
      <div className="bg-surface-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        {isLoading ? (
          <div className="p-12 text-center space-y-3">
            <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs text-slate-400">Loading live stock levels from inventory database...</p>
          </div>
        ) : filteredInventory.length === 0 ? (
          <div className="p-16 text-center space-y-3">
            <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto opacity-70" />
            <h3 className="text-base font-bold text-white">No Inventory Issues Found</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
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
              >
                Clear Filters
              </Button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800 bg-surface-950/60 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  <th className="py-3.5 px-4">Product / SKU</th>
                  <th className="py-3.5 px-4">Category</th>
                  <th className="py-3.5 px-4 text-center">Variant / Size</th>
                  <th className="py-3.5 px-4">Unit Price</th>
                  <th className="py-3.5 px-4">Stock Health</th>
                  <th className="py-3.5 px-4 text-center">Units on Hand</th>
                  <th className="py-3.5 px-4 text-right">Quick Restock</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-xs">
                {filteredInventory.map((item) => {
                  const isZero = item.stock_qty === 0;
                  const isLow = item.stock_qty > 0 && item.stock_qty <= 5;

                  return (
                    <tr
                      key={`${item.productId}-${item.variantId}-${item.size}`}
                      className={`hover:bg-surface-800/40 transition-colors ${
                        isZero
                          ? 'bg-rose-950/10'
                          : isLow
                          ? 'bg-amber-950/10'
                          : ''
                      }`}
                    >
                      {/* Product Name & Thumbnail */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-surface-800 border border-slate-700/80 overflow-hidden flex-shrink-0 flex items-center justify-center text-slate-500">
                            {item.imageUrl ? (
                              <img src={item.imageUrl} alt={item.productName} className="w-full h-full object-cover" />
                            ) : (
                              <Package className="w-5 h-5 text-slate-600" />
                            )}
                          </div>
                          <div>
                            <Link
                              to={`/store/${item.productId}`}
                              className="font-bold text-white hover:text-brand-400 transition-colors line-clamp-1"
                            >
                              {item.productName}
                            </Link>
                            <span className="text-[10px] font-mono text-slate-500 block">
                              {item.sku}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Category */}
                      <td className="py-3.5 px-4">
                        <span className="capitalize text-slate-400 bg-surface-800 px-2 py-0.5 rounded-md text-[11px] font-medium">
                          {item.productType}
                        </span>
                      </td>

                      {/* Size */}
                      <td className="py-3.5 px-4 text-center">
                        <span className="inline-block px-2.5 py-1 bg-surface-800 border border-slate-700 font-mono font-bold text-white rounded-md text-xs">
                          {item.size}
                        </span>
                      </td>

                      {/* Unit Price */}
                      <td className="py-3.5 px-4 font-semibold text-slate-300">
                        ${item.price.toFixed(2)}
                      </td>

                      {/* Stock Health Status */}
                      <td className="py-3.5 px-4">
                        {isZero ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30">
                            <TrendingDown className="w-3 h-3" /> Out of Stock
                          </span>
                        ) : isLow ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30 animate-pulse">
                            <AlertTriangle className="w-3 h-3" /> Low Stock (&le; 5)
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            <CheckCircle2 className="w-3 h-3" /> Healthy
                          </span>
                        )}
                      </td>

                      {/* Units on Hand */}
                      <td className="py-3.5 px-4 text-center">
                        <span
                          className={`font-mono text-sm font-black ${
                            isZero
                              ? 'text-rose-400'
                              : isLow
                              ? 'text-amber-400'
                              : 'text-white'
                          }`}
                        >
                          {item.stock_qty}
                        </span>
                      </td>

                      {/* Restock Action Button */}
                      <td className="py-3.5 px-4 text-right">
                        <Button
                          variant={isZero ? 'danger' : isLow ? 'warning' : 'outline'}
                          size="sm"
                          onClick={() => handleOpenRestock(item)}
                          className="h-8 text-xs font-semibold"
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
          <div className="space-y-5 p-1">
            <div className="bg-surface-950 p-4 rounded-xl border border-slate-800 space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-slate-400">Variant Size:</span>
                <span className="font-bold text-white font-mono bg-surface-800 px-2 py-0.5 rounded">
                  {restockItem.size}
                </span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-400">Current Stock Level:</span>
                <span
                  className={`font-bold font-mono ${
                    restockItem.stock_qty === 0 ? 'text-rose-400' : 'text-amber-400'
                  }`}
                >
                  {restockItem.stock_qty} unit(s)
                </span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-400">SKU Code:</span>
                <span className="font-mono text-slate-300">{restockItem.sku}</span>
              </div>
            </div>

            {/* Quantity Input */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">
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
                    className={`text-xs px-2.5 py-1 rounded-lg border transition-all ${
                      restockQty === quickAmount
                        ? 'bg-brand-600 border-brand-500 text-white'
                        : 'bg-surface-800 border-slate-700 text-slate-400 hover:text-white'
                    }`}
                  >
                    +{quickAmount}
                  </button>
                ))}
              </div>
            </div>

            {/* Restock Summary */}
            <div className="p-3 bg-brand-950/30 border border-brand-500/20 rounded-xl text-xs text-brand-300 flex items-center gap-2">
              <Zap className="w-4 h-4 text-brand-400 flex-shrink-0" />
              <span>
                New resulting stock after replenishment will be{' '}
                <strong className="text-white font-mono">
                  {restockItem.stock_qty + Number(restockQty || 0)} units
                </strong>
                .
              </span>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <Button
                variant="ghost"
                onClick={() => setRestockItem(null)}
                disabled={restockMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleConfirmRestock}
                disabled={restockMutation.isPending}
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
