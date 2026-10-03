import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Package, Clock, CheckCircle, XCircle, ArrowLeft, RefreshCw, ShoppingBag, ShieldCheck } from 'lucide-react';
import { useAuth } from '../../lib/AuthContext';
import { useToast } from '../../components/ui/Toast';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import api from '../../lib/api';

export default function OrderHistoryPage() {
  const { user, isAuthenticated, isOfficer } = useAuth();
  const toast = useToast();
  const queryClient = useQueryClient();
  const [selectedStatus, setSelectedStatus] = useState('all');

  const { data: orders, isLoading, error, refetch } = useQuery({
    queryKey: ['orders', selectedStatus],
    queryFn: async () => {
      const params = {};
      if (selectedStatus !== 'all') params.status = selectedStatus;
      const res = await api.get('/orders/', { params });
      return res.data?.results || res.data || [];
    },
    staleTime: 1000 * 10,
  });

  const fulfillMutation = useMutation({
    mutationFn: async (orderId) => {
      const res = await api.post(`/orders/${orderId}/fulfill/`);
      return res.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      toast.success(data.message || 'Order marked as fulfilled.');
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Failed to fulfill order.');
    },
  });

  const cancelMutation = useMutation({
    mutationFn: async (orderId) => {
      const res = await api.post(`/orders/${orderId}/cancel/`, { reason: 'Cancelled by officer' });
      return res.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast.success(data.message || 'Order cancelled & stock restored.');
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Failed to cancel order.');
    },
  });

  const getStatusBadge = (status) => {
    switch (status?.toLowerCase()) {
      case 'paid':
        return <Badge variant="success">Paid</Badge>;
      case 'fulfilled':
        return <Badge variant="accent">Fulfilled</Badge>;
      case 'pending':
        return <Badge variant="warning">Pending Payment</Badge>;
      case 'cancelled':
        return <Badge variant="danger">Cancelled</Badge>;
      default:
        return <Badge variant="neutral">{status}</Badge>;
    }
  };

  return (
    <div className="max-w-5xl mx-auto pb-20 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link to="/store" className="text-xs font-semibold text-brand-400 hover:underline flex items-center gap-1">
              <ArrowLeft className="w-3.5 h-3.5" /> Back to Store
            </Link>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white">
            {isOfficer ? 'Store Orders Management' : 'My Merch Orders'}
          </h1>
          <p className="text-sm text-slate-400 mt-0.5">
            {isOfficer
              ? 'View all customer orders, fulfillment status, and inventory deductions.'
              : 'Track your merchandise orders, payment status, and pickup receipts.'}
          </p>
        </div>

        <Button variant="secondary" size="sm" onClick={() => refetch()}>
          <RefreshCw className="w-4 h-4 mr-1.5" /> Refresh Orders
        </Button>
      </div>

      {/* Status Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        {['all', 'pending', 'paid', 'fulfilled', 'cancelled'].map((st) => (
          <button
            key={st}
            onClick={() => setSelectedStatus(st)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold capitalize transition-all ${
              selectedStatus === st
                ? 'bg-brand-600 text-white shadow-md'
                : 'bg-surface-900 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            {st}
          </button>
        ))}
      </div>

      {/* Orders List */}
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((n) => (
            <div key={n} className="p-6 rounded-2xl bg-surface-900 border border-slate-800 animate-pulse space-y-3">
              <div className="h-5 bg-slate-800 rounded w-1/4" />
              <div className="h-4 bg-slate-800 rounded w-1/2" />
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="p-8 rounded-2xl bg-surface-900 border border-danger-900 text-center text-sm text-danger-300">
          Failed to load orders. Please make sure the backend server is reachable.
        </div>
      ) : orders.length === 0 ? (
        <div className="text-center py-20 bg-surface-900/60 rounded-3xl border border-slate-800 p-8 space-y-3">
          <Package className="w-12 h-12 text-slate-500 mx-auto" />
          <h3 className="text-base font-bold text-white">No Orders Found</h3>
          <p className="text-xs text-slate-400 max-w-xs mx-auto">
            {selectedStatus !== 'all'
              ? `There are no orders with status '${selectedStatus}'.`
              : 'You have not placed any store orders yet.'}
          </p>
          <Link to="/store">
            <Button variant="outline" size="sm" className="mt-4">
              Browse Merchandise Catalog
            </Button>
          </Link>
        </div>
      ) : (
        <div className="space-y-5">
          {orders.map((order) => (
            <div
              key={order.id}
              className="p-6 rounded-2xl bg-surface-900/90 border border-slate-800 shadow-lg space-y-5"
            >
              {/* Top Row: Order ID, Date, Buyer & Status */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-4">
                <div>
                  <div className="flex items-center gap-2.5">
                    <span className="text-base font-extrabold text-white">Order #{order.id}</span>
                    {getStatusBadge(order.status)}
                    <Badge variant="neutral" size="sm">
                      {order.payment_provider === 'stripe' ? 'Stripe Card' : 'Instant / Mock'}
                    </Badge>
                  </div>
                  <div className="text-xs text-slate-400 mt-1 flex items-center gap-3">
                    <span>Placed: {new Date(order.created_at).toLocaleString()}</span>
                    <span>•</span>
                    <span>Buyer: {order.buyer_name || order.buyer_username || 'Guest'}</span>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-xs text-slate-400 block">Total Amount</span>
                  <span className="text-xl font-black text-brand-300">${Number(order.total).toFixed(2)}</span>
                </div>
              </div>

              {/* Items Table */}
              <div className="space-y-2.5">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Order Items:</span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {order.items?.map((item) => (
                    <div
                      key={item.id}
                      className="p-3 rounded-xl bg-surface-950/60 border border-slate-800/80 flex items-center gap-3"
                    >
                      <div className="w-12 h-12 rounded-lg bg-slate-800 overflow-hidden flex-shrink-0 flex items-center justify-center border border-slate-700">
                        {item.product_image ? (
                          <img src={item.product_image} alt={item.product_name} className="w-full h-full object-cover" />
                        ) : (
                          <ShoppingBag className="w-5 h-5 text-slate-500" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-xs font-bold text-white truncate">{item.product_name}</h4>
                        <p className="text-[11px] text-slate-400">
                          Size <strong className="text-slate-200">{item.size}</strong> × {item.qty} units @ ${Number(item.unit_price).toFixed(2)}
                        </p>
                      </div>
                      <span className="text-xs font-bold text-slate-200">
                        ${Number(item.total_price || item.unit_price * item.qty).toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Price Details & Discount breakdown */}
              <div className="p-3.5 rounded-xl bg-surface-950/40 border border-slate-800/60 flex flex-wrap items-center justify-between gap-4 text-xs text-slate-400">
                <div className="flex items-center gap-4">
                  <span>Subtotal: <strong className="text-slate-200">${Number(order.subtotal).toFixed(2)}</strong></span>
                  {Number(order.discount_amount) > 0 && (
                    <span className="text-emerald-400 font-semibold">
                      Member Savings ({Number(order.discount_pct)}%): -${Number(order.discount_amount).toFixed(2)}
                    </span>
                  )}
                  {order.payment_reference && (
                    <span className="text-slate-500">Ref: {order.payment_reference}</span>
                  )}
                </div>

                {/* Officer Fulfillment Controls */}
                {isOfficer && (
                  <div className="flex items-center gap-2">
                    {order.status === 'paid' && (
                      <Button
                        variant="primary"
                        size="sm"
                        isLoading={fulfillMutation.isPending}
                        onClick={() => fulfillMutation.mutate(order.id)}
                      >
                        <CheckCircle className="w-3.5 h-3.5 mr-1" /> Mark Fulfilled
                      </Button>
                    )}
                    {['pending', 'paid'].includes(order.status) && (
                      <Button
                        variant="danger"
                        size="sm"
                        isLoading={cancelMutation.isPending}
                        onClick={() => cancelMutation.mutate(order.id)}
                      >
                        <XCircle className="w-3.5 h-3.5 mr-1" /> Cancel Order
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
