import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Package, Clock, CheckCircle, ArrowLeft, RefreshCw, ShoppingBag, ShieldCheck, Eye, MapPin } from 'lucide-react';
import { useAuth } from '../../lib/AuthContext';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import api from '../../lib/api';

export default function MyOrdersPage() {
  const { user, isAuthenticated, isOfficer } = useAuth();
  const [selectedStatus, setSelectedStatus] = useState('all');

  const { data: orders, isLoading, error, refetch } = useQuery({
    queryKey: ['myOrders', selectedStatus],
    queryFn: async () => {
      const params = {};
      if (selectedStatus !== 'all') params.status = selectedStatus;
      const res = await api.get('/orders/', { params });
      return res.data?.results || res.data || [];
    },
    staleTime: 1000 * 10,
  });

  const getStatusBadge = (status) => {
    switch (status?.toLowerCase()) {
      case 'paid':
        return <Badge variant="success">Paid & Ready</Badge>;
      case 'fulfilled':
        return <Badge variant="accent">Fulfilled / Picked Up</Badge>;
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
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white">My Merch Orders</h1>
          <p className="text-sm text-slate-400 mt-0.5">
            Track your apparel orders, payment receipts, and campus pickup status.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {isOfficer && (
            <Link to="/store/manage/orders">
              <Button variant="outline" size="sm">
                <ShieldCheck className="w-4 h-4 mr-1.5 text-brand-400" /> Officer Order Desk
              </Button>
            </Link>
          )}

          <Button variant="secondary" size="sm" onClick={() => refetch()}>
            <RefreshCw className="w-4 h-4 mr-1.5" /> Refresh
          </Button>
        </div>
      </div>

      {/* Status Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        {['all', 'paid', 'fulfilled', 'pending', 'cancelled'].map((st) => (
          <button
            key={st}
            onClick={() => setSelectedStatus(st)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold capitalize transition-all ${
              selectedStatus === st
                ? 'bg-brand-600 text-white shadow-md'
                : 'bg-surface-900 text-slate-400 hover:text-white border border-slate-800'
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
            <div key={n} className="p-6 rounded-2xl bg-surface-900 border border-slate-800 animate-pulse space-y-3">
              <div className="h-5 bg-slate-800 rounded w-1/4" />
              <div className="h-4 bg-slate-800 rounded w-1/2" />
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="p-8 rounded-2xl bg-surface-900 border border-danger-900 text-center text-sm text-danger-300">
          Failed to load your orders. Please make sure you are signed in.
        </div>
      ) : orders.length === 0 ? (
        <div className="text-center py-20 bg-surface-900/60 rounded-3xl border border-slate-800 p-8 space-y-3">
          <Package className="w-12 h-12 text-slate-500 mx-auto" />
          <h3 className="text-base font-bold text-white">No Orders Found</h3>
          <p className="text-xs text-slate-400 max-w-xs mx-auto">
            {selectedStatus !== 'all'
              ? `You have no orders matching status '${selectedStatus}'.`
              : 'You have not placed any store orders yet.'}
          </p>
          <Link to="/store">
            <Button variant="primary" size="sm" className="mt-4">
              Browse Store Catalog
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
              {/* Header: Order ID, Status, Timestamp */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-4">
                <div>
                  <div className="flex items-center gap-2.5">
                    <span className="text-base font-extrabold text-white">Order #{order.id}</span>
                    {getStatusBadge(order.status)}
                    <Badge variant="neutral" size="sm">
                      {order.payment_provider === 'stripe' ? 'Credit Card' : 'Instant Mock'}
                    </Badge>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    Placed on {new Date(order.created_at).toLocaleString()}
                  </p>
                </div>

                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <span className="text-xs text-slate-400 block">Total Paid</span>
                    <span className="text-xl font-black text-brand-300">${Number(order.total).toFixed(2)}</span>
                  </div>

                  <Link to={`/store/orders/${order.id}/confirmation`}>
                    <Button variant="outline" size="sm">
                      <Eye className="w-3.5 h-3.5 mr-1" /> Receipt
                    </Button>
                  </Link>
                </div>
              </div>

              {/* Items Summary */}
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
                        Size <strong className="text-slate-200">{item.size}</strong> × {item.qty} units
                      </p>
                    </div>
                    <span className="text-xs font-bold text-slate-200">
                      ${Number(item.total_price || item.unit_price * item.qty).toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>

              {/* Notes & Pickup Notice */}
              {order.notes && (
                <div className="p-3 rounded-xl bg-surface-950/40 border border-slate-800 text-xs text-slate-300 flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-brand-400 flex-shrink-0" />
                  <span>{order.notes}</span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
