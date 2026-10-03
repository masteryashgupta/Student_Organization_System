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
        return <Badge variant="success" className="bg-emerald-50 text-emerald-800 border-emerald-200">Paid</Badge>;
      case 'fulfilled':
        return <Badge variant="accent" className="bg-[#017E84]/10 text-[#017E84] border-[#017E84]/20">Fulfilled</Badge>;
      case 'pending':
        return <Badge variant="warning" className="bg-amber-50 text-amber-800 border-amber-200">Pending Payment</Badge>;
      case 'cancelled':
        return <Badge variant="danger" className="bg-rose-50 text-rose-800 border-rose-200">Cancelled</Badge>;
      default:
        return <Badge variant="neutral" className="bg-[#FAF9F7] text-[#222222] border-border">{status}</Badge>;
    }
  };

  return (
    <div className="max-w-5xl mx-auto pb-20 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <Link to="/store" className="text-xs font-semibold text-[#714B67] hover:text-[#5B3B52] flex items-center gap-1.5 transition-colors">
              <ArrowLeft className="w-3.5 h-3.5" /> Back to Store
            </Link>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#222222]">
            {isOfficer ? 'Store Orders Management' : 'My Merch Orders'}
          </h1>
          <p className="text-sm text-[#66636A] mt-0.5">
            {isOfficer
              ? 'View all customer orders, fulfillment status, and inventory deductions.'
              : 'Track your merchandise orders, payment status, and pickup receipts.'}
          </p>
        </div>

        <Button variant="secondary" size="sm" onClick={() => refetch()} className="border-border bg-white text-[#222222] hover:bg-[#FAF9F7]">
          <RefreshCw className="w-4 h-4 mr-1.5 text-[#66636A]" /> Refresh Orders
        </Button>
      </div>

      {/* Status Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        {['all', 'pending', 'paid', 'fulfilled', 'cancelled'].map((st) => (
          <button
            key={st}
            type="button"
            onClick={() => setSelectedStatus(st)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold capitalize transition-all ${
              selectedStatus === st
                ? 'bg-[#714B67] text-white shadow-sm'
                : 'bg-white text-[#66636A] hover:text-[#222222] border border-border shadow-sm hover:border-gray-300'
            }`}
          >
            {st === 'all' ? 'All Orders' : st}
          </button>
        ))}
      </div>

      {/* Orders List */}
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((n) => (
            <div key={n} className="p-6 rounded-2xl bg-white border border-border shadow-odoo-card animate-pulse space-y-3">
              <div className="h-5 bg-gray-200 rounded w-1/4" />
              <div className="h-4 bg-gray-100 rounded w-1/2" />
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="p-8 rounded-2xl bg-white border border-rose-200 shadow-odoo-card text-center text-sm text-rose-700">
          Failed to load orders.
        </div>
      ) : orders.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-3xl border border-border shadow-odoo-card p-8 space-y-3">
          <div className="w-16 h-16 rounded-2xl bg-[#714B67]/10 flex items-center justify-center mx-auto text-[#714B67]">
            <Package className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-[#222222]">No Orders Found</h3>
          <p className="text-xs text-[#66636A]">
            {selectedStatus !== 'all'
              ? `No orders matching status '${selectedStatus}'.`
              : 'There are currently no orders in the system.'}
          </p>
        </div>
      ) : (
        <div className="space-y-5">
          {orders.map((order) => (
            <div
              key={order.id}
              className="p-6 rounded-2xl bg-white border border-border shadow-odoo-card space-y-5 transition-all hover:border-[#714B67]/30"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-4">
                <div>
                  <div className="flex items-center gap-2.5">
                    <span className="text-base font-extrabold text-[#222222]">Order #{order.id}</span>
                    {getStatusBadge(order.status)}
                    <span className="text-xs font-medium text-[#66636A] capitalize">
                      via {order.payment_provider || 'Mock'}
                    </span>
                  </div>
                  <p className="text-xs text-[#66636A] mt-1">
                    Placed on {new Date(order.created_at).toLocaleString()} by <strong className="text-[#222222]">{order.buyer_name || 'Guest'}</strong>
                  </p>
                </div>

                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <span className="text-xs text-[#66636A] block">Total Amount</span>
                    <span className="text-xl font-black text-[#714B67]">${Number(order.total).toFixed(2)}</span>
                  </div>

                  {isOfficer && order.status === 'paid' && (
                    <Button
                      variant="primary"
                      size="sm"
                      className="bg-[#714B67] hover:bg-[#5B3B52] text-white"
                      isLoading={fulfillMutation.isPending}
                      onClick={() => fulfillMutation.mutate(order.id)}
                    >
                      <CheckCircle className="w-3.5 h-3.5 mr-1" /> Fulfill
                    </Button>
                  )}

                  {isOfficer && ['pending', 'paid'].includes(order.status) && (
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => {
                        if (window.confirm(`Are you sure you want to cancel Order #${order.id}? Stock will be restored.`)) {
                          cancelMutation.mutate(order.id);
                        }
                      }}
                    >
                      <XCircle className="w-3.5 h-3.5 mr-1" /> Cancel
                    </Button>
                  )}
                </div>
              </div>

              {/* Items List */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {order.items?.map((item) => (
                  <div
                    key={item.id}
                    className="p-3 rounded-xl bg-[#FAF9F7] border border-border flex items-center justify-between"
                  >
                    <div>
                      <h4 className="text-xs font-bold text-[#222222]">{item.product_name}</h4>
                      <p className="text-[11px] text-[#66636A]">Size {item.size} × {item.qty} units</p>
                    </div>
                    <span className="text-xs font-bold text-[#222222]">
                      ${Number(item.total_price || item.unit_price * item.qty).toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
