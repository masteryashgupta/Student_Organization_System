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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Badge variant="accent" className="flex items-center gap-1.5 px-3 py-1 font-semibold bg-[#714B67]/10 text-[#714B67] border-[#714B67]/20">
              <ShieldCheck className="w-3.5 h-3.5 text-[#714B67]" /> Officer Control Desk
            </Badge>
            <span className="text-[#66636A]">/</span>
            <Link to="/store" className="text-xs font-semibold text-[#66636A] hover:text-[#714B67] flex items-center gap-1 transition-colors">
              <ArrowLeft className="w-3 h-3" /> Live Store
            </Link>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#222222] tracking-tight flex items-center gap-2.5">
            Merch Stock & Low-Stock Alerts
          </h1>
          <p className="text-sm text-[#66636A] mt-1">
            Real-time per-size stock monitoring, automated replenishment alerts (&le; 5 units), and instant SKU restock.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link to="/store/manage/orders">
            <Button variant="outline" size="sm" className="font-semibold border-border text-[#222222] hover:bg-white">
              <Boxes className="w-4 h-4 mr-1.5 text-[#714B67]" /> Order Fulfillment Desk
            </Button>
          </Link>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => refetch()}
            disabled={isFetching}
            className="text-[#66636A] hover:text-[#222222]"
          >
            <RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin text-[#714B67]' : ''}`} />
          </Button>
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Total SKUs */}
        <div className="bg-white border border-border p-5 rounded-2xl shadow-odoo-card">
          <div className="flex items-center justify-between text-[#66636A] mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Active SKUs</span>
            <Layers className="w-4 h-4 text-[#714B67]" />
          </div>
          <div className="text-3xl font-black text-[#222222]">{stats.totalSKUs}</div>
          <p className="text-xs text-[#66636A] mt-1">Across {products.length} catalog products</p>
        </div>

        {/* Low Stock Alert (<= 5) */}
        <div
          onClick={() => setStockFilter(stockFilter === 'low' ? 'all' : 'low')}
          className={`cursor-pointer transition-all border p-5 rounded-2xl shadow-odoo-card ${
            stats.lowStockCount > 0
              ? 'bg-amber-50/50 border-amber-300 hover:border-amber-400'
              : 'bg-white border-border'
          }`}
        >
          <div className="flex items-center justify-between text-amber-800 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider flex items-center gap-1">
              <AlertTriangle className="w-3.5 h-3.5" /> Low Stock (&le; 5)
            </span>
            <span className="text-xs font-bold bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full border border-amber-200">
              {stats.lowStockCount}
            </span>
          </div>
          <div className="text-3xl font-black text-amber-700">{stats.lowStockCount}</div>
          <p className="text-xs text-amber-800/80 mt-1">Requires replenishment</p>
        </div>

        {/* Out of Stock (0) */}
        <div
          onClick={() => setStockFilter(stockFilter === 'out' ? 'all' : 'out')}
          className={`cursor-pointer transition-all border p-5 rounded-2xl shadow-odoo-card ${
            stats.outOfStockCount > 0
              ? 'bg-rose-50/50 border-rose-300 hover:border-rose-400'
              : 'bg-white border-border'
          }`}
        >
          <div className="flex items-center justify-between text-rose-800 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider flex items-center gap-1">
              <TrendingDown className="w-3.5 h-3.5" /> Out of Stock (0)
            </span>
            <span className="text-xs font-bold bg-rose-100 text-rose-800 px-2 py-0.5 rounded-full border border-rose-200">
              {stats.outOfStockCount}
            </span>
          </div>
          <div className="text-3xl font-black text-rose-700">{stats.outOfStockCount}</div>
          <p className="text-xs text-rose-800/80 mt-1">Buying currently disabled</p>
        </div>

        {/* Total Units in Stock */}
        <div className="bg-white border border-border p-5 rounded-2xl shadow-odoo-card">
          <div className="flex items-center justify-between text-[#66636A] mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Total Units on Hand</span>
            <Package className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-3xl font-black text-emerald-600">{stats.totalUnits}</div>
          <p className="text-xs text-[#66636A] mt-1">
            ${stats.totalAssetValue.toFixed(2)} retail inventory
          </p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white border border-border p-4 rounded-2xl shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Status Filter Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
          <button
            type="button"
            onClick={() => setStockFilter('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
              stockFilter === 'all'
                ? 'bg-[#714B67] text-white shadow-sm'
                : 'bg-[#FAF9F7] text-[#66636A] hover:text-[#222222] border border-border'
            }`}
          >
            All SKUs ({flattenedInventory.length})
          </button>
          <button
            type="button"
            onClick={() => setStockFilter('low')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
              stockFilter === 'low'
                ? 'bg-amber-600 text-white shadow-sm'
                : 'bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200'
            }`}
          >
            <AlertTriangle className="w-3 h-3" />
            Low Stock ({stats.lowStockCount})
          </button>
          <button
            type="button"
            onClick={() => setStockFilter('out')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
              stockFilter === 'out'
                ? 'bg-rose-600 text-white shadow-sm'
                : 'bg-rose-50 text-rose-800 hover:bg-rose-100 border border-rose-200'
            }`}
          >
            <TrendingDown className="w-3 h-3" />
            Out of Stock ({stats.outOfStockCount})
          </button>
          <button
            type="button"
            onClick={() => setStockFilter('healthy')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
              stockFilter === 'healthy'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200'
            }`}
          >
            Healthy ({stats.healthyCount})
          </button>
        </div>

        {/* Search Input */}
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#66636A]" />
          <input
            type="text"
            placeholder="Search SKU, Product, or Size..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs bg-[#FAF9F7] border border-border rounded-xl text-[#222222] placeholder-[#66636A] focus:outline-none focus:ring-2 focus:ring-[#714B67] transition-all"
          />
        </div>
      </div>

      {/* Inventory Table */}
      <div className="bg-white border border-border rounded-3xl overflow-hidden shadow-odoo-card">
        {isLoading ? (
          <div className="p-12 text-center space-y-3">
            <div className="w-8 h-8 border-2 border-[#714B67] border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs text-[#66636A]">Loading live stock levels from inventory database...</p>
          </div>
        ) : filteredInventory.length === 0 ? (
          <div className="p-16 text-center space-y-3">
            <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto opacity-70" />
            <h3 className="text-base font-bold text-[#222222]">No Inventory Issues Found</h3>
            <p className="text-xs text-[#66636A] max-w-sm mx-auto">
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
                className="border-border text-[#222222] hover:bg-[#FAF9F7]"
              >
                Clear Filters
              </Button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-border bg-[#FAF9F7] text-[11px] font-bold text-[#66636A] uppercase tracking-wider">
                  <th className="py-3.5 px-4">Product / SKU</th>
                  <th className="py-3.5 px-4">Category</th>
                  <th className="py-3.5 px-4 text-center">Variant / Size</th>
                  <th className="py-3.5 px-4">Unit Price</th>
                  <th className="py-3.5 px-4">Stock Health</th>
                  <th className="py-3.5 px-4 text-center">Units on Hand</th>
                  <th className="py-3.5 px-4 text-right">Quick Restock</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border text-xs">
                {filteredInventory.map((item) => {
                  const isZero = item.stock_qty === 0;
                  const isLow = item.stock_qty > 0 && item.stock_qty <= 5;

                  return (
                    <tr
                      key={`${item.productId}-${item.variantId}-${item.size}`}
                      className={`hover:bg-[#FAF9F7]/70 transition-colors ${
                        isZero
                          ? 'bg-rose-50/30'
                          : isLow
                          ? 'bg-amber-50/30'
                          : ''
                      }`}
                    >
                      {/* Product Name & Thumbnail */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-canvas border border-border overflow-hidden flex-shrink-0 flex items-center justify-center text-[#66636A]">
                            {item.imageUrl ? (
                              <img src={item.imageUrl} alt={item.productName} className="w-full h-full object-cover" />
                            ) : (
                              <Package className="w-5 h-5 text-[#66636A]" />
                            )}
                          </div>
                          <div>
                            <Link
                              to={`/store/${item.productId}`}
                              className="font-bold text-[#222222] hover:text-[#714B67] transition-colors line-clamp-1"
                            >
                              {item.productName}
                            </Link>
                            <span className="text-[10px] font-mono text-[#66636A] block">
                              {item.sku}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Category */}
                      <td className="py-3.5 px-4">
                        <span className="capitalize text-[#66636A] bg-[#FAF9F7] border border-border px-2 py-0.5 rounded-md text-[11px] font-medium">
                          {item.productType}
                        </span>
                      </td>

                      {/* Size */}
                      <td className="py-3.5 px-4 text-center">
                        <span className="inline-block px-2.5 py-1 bg-[#FAF9F7] border border-border font-mono font-bold text-[#222222] rounded-md text-xs">
                          {item.size}
                        </span>
                      </td>

                      {/* Unit Price */}
                      <td className="py-3.5 px-4 font-semibold text-[#222222]">
                        ${item.price.toFixed(2)}
                      </td>

                      {/* Stock Health Status */}
                      <td className="py-3.5 px-4">
                        {isZero ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-50 text-rose-800 border border-rose-200">
                            <TrendingDown className="w-3 h-3" /> Out of Stock
                          </span>
                        ) : isLow ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                            <AlertTriangle className="w-3 h-3" /> Low Stock (&le; 5)
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3" /> Healthy
                          </span>
                        )}
                      </td>

                      {/* Units on Hand */}
                      <td className="py-3.5 px-4 text-center">
                        <span
                          className={`font-mono text-sm font-black ${
                            isZero
                              ? 'text-rose-600'
                              : isLow
                              ? 'text-amber-600'
                              : 'text-[#222222]'
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
          <div className="space-y-5 p-1 text-xs">
            <div className="bg-[#FAF9F7] p-4 rounded-xl border border-border space-y-2">
              <div className="flex justify-between">
                <span className="text-[#66636A]">Variant Size:</span>
                <span className="font-bold text-[#222222] font-mono bg-white border border-border px-2 py-0.5 rounded">
                  {restockItem.size}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#66636A]">Current Stock Level:</span>
                <span
                  className={`font-bold font-mono ${
                    restockItem.stock_qty === 0 ? 'text-rose-600' : 'text-amber-600'
                  }`}
                >
                  {restockItem.stock_qty} unit(s)
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#66636A]">SKU Code:</span>
                <span className="font-mono text-[#222222]">{restockItem.sku}</span>
              </div>
            </div>

            {/* Quantity Input */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-[#222222] uppercase tracking-wider">
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
                        ? 'bg-[#714B67] border-[#714B67] text-white font-semibold'
                        : 'bg-[#FAF9F7] border-border text-[#66636A] hover:text-[#222222]'
                    }`}
                  >
                    +{quickAmount}
                  </button>
                ))}
              </div>
            </div>

            {/* Restock Summary */}
            <div className="p-3 bg-[#714B67]/10 border border-[#714B67]/20 rounded-xl text-xs text-[#714B67] flex items-center gap-2">
              <Zap className="w-4 h-4 text-[#714B67] flex-shrink-0" />
              <span>
                New resulting stock after replenishment will be{' '}
                <strong className="text-[#222222] font-mono">
                  {restockItem.stock_qty + Number(restockQty || 0)} units
                </strong>
                .
              </span>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-3 pt-2 border-t border-border">
              <Button
                variant="ghost"
                onClick={() => setRestockItem(null)}
                disabled={restockMutation.isPending}
                className="text-[#66636A] hover:text-[#222222]"
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleConfirmRestock}
                disabled={restockMutation.isPending}
                className="bg-[#714B67] hover:bg-[#5B3B52] text-white"
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
