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
        return (
          <Badge variant="success" className="rounded-full px-3">
            Paid & Ready
          </Badge>
        );
      case 'fulfilled':
        return (
          <Badge variant="accent" className="rounded-full px-3">
            Fulfilled / Picked Up
          </Badge>
        );
      case 'pending':
        return (
          <Badge variant="warning" className="rounded-full px-3">
            Pending Payment
          </Badge>
        );
      case 'cancelled':
        return (
          <Badge variant="danger" className="rounded-full px-3">
            Cancelled
          </Badge>
        );
      default:
        return <Badge variant="neutral" className="rounded-full px-3">{status}</Badge>;
    }
  };

  return (
    <div className="max-w-5xl mx-auto pb-20 space-y-8 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/60 dark:border-slate-800/60 pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <Link to="/store" className="text-xs font-bold text-brand-600 dark:text-brand-400 hover:underline flex items-center gap-1.5 transition-colors">
              <ArrowLeft className="w-3.5 h-3.5" /> Back to Store
            </Link>
          </div>
          <h1 className="text-2xl sm:text-4xl font-extrabold text-slate-900 dark:text-white">My Merch Orders</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Track your apparel orders, payment receipts, and campus pickup status.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {isOfficer && (
            <Link to="/store/manage/orders">
              <Button variant="outline" size="sm" className="rounded-full font-semibold border-slate-200/80 dark:border-slate-700/80 text-slate-900 dark:text-white hover:bg-slate-100 dark:hover:bg-slate-800">
                <ShieldCheck className="w-4 h-4 mr-1.5 text-brand-600 dark:text-brand-400" /> Officer Order Desk
              </Button>
            </Link>
          )}

          <Button variant="secondary" size="sm" onClick={() => refetch()} className="rounded-full border-slate-200/80 dark:border-slate-700/80">
            <RefreshCw className="w-4 h-4 mr-1.5 text-slate-500" /> Refresh
          </Button>
        </div>
      </div>

      {/* Status Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        {['all', 'paid', 'fulfilled', 'pending', 'cancelled'].map((st) => (
          <button
            key={st}
            type="button"
            onClick={() => setSelectedStatus(st)}
            className={`px-4 py-2 rounded-full text-xs font-bold capitalize transition-all whitespace-nowrap ${
              selectedStatus === st
                ? 'bg-gradient-to-r from-brand-600 to-indigo-600 text-white shadow-md shadow-brand-500/20'
                : 'glass-card bg-white/70 dark:bg-slate-900/70 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white border border-slate-200/80 dark:border-slate-800/80 shadow-sm'
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
            <div key={n} className="p-6 rounded-3xl glass-card bg-slate-100/50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800/60 shadow-md animate-pulse space-y-3">
              <div className="h-5 bg-slate-200 dark:bg-slate-700 rounded-lg w-1/4" />
              <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded-lg w-1/2" />
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="p-8 rounded-3xl glass-panel bg-rose-500/10 border border-rose-300/40 dark:border-rose-900/50 text-center text-sm text-rose-800 dark:text-rose-300 shadow-xl">
          Failed to load your orders. Please make sure you are signed in.
        </div>
      ) : orders.length === 0 ? (
        <div className="text-center py-16 glass-panel rounded-3xl border border-white/40 dark:border-slate-800/80 shadow-2xl p-8 space-y-3">
          <div className="w-16 h-16 rounded-3xl bg-brand-500/10 dark:bg-brand-500/20 flex items-center justify-center mx-auto text-brand-600 dark:text-brand-400 shadow-inner">
            <Package className="w-8 h-8" />
          </div>
          <h3 className="text-xl font-extrabold text-slate-900 dark:text-white">No Orders Found</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs mx-auto">
            {selectedStatus !== 'all'
              ? `You have no orders matching status '${selectedStatus}'.`
              : 'You have not placed any store orders yet.'}
          </p>
          <Link to="/store">
            <Button variant="primary" size="sm" className="mt-4 rounded-full px-6 bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 text-white shadow-md shadow-brand-500/20 font-bold">
              Browse Store Catalog
            </Button>
          </Link>
        </div>
      ) : (
        <div className="space-y-5">
          {orders.map((order) => (
            <div
              key={order.id}
              className="p-6 sm:p-8 rounded-3xl glass-panel border-white/40 dark:border-slate-800/80 shadow-xl space-y-5 transition-all hover:border-brand-300 dark:hover:border-brand-700"
            >
              {/* Header: Order ID, Status, Timestamp */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200/60 dark:border-slate-800/60 pb-4">
                <div>
                  <div className="flex items-center gap-2.5">
                    <span className="text-lg font-black text-slate-900 dark:text-white">Order #{order.id}</span>
                    {getStatusBadge(order.status)}
                    <Badge variant="neutral" size="sm" className="rounded-full text-[10px] px-2.5">
                      {order.payment_provider === 'stripe' ? 'Credit Card' : 'Instant Mock'}
                    </Badge>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    Placed on {new Date(order.created_at).toLocaleString()}
                  </p>
                </div>

                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <span className="text-xs text-slate-400 font-medium block">Total Paid</span>
                    <span className="text-2xl font-black text-brand-600 dark:text-brand-400">${Number(order.total).toFixed(2)}</span>
                  </div>

                  <Link to={`/store/orders/${order.id}/confirmation`}>
                    <Button variant="outline" size="sm" className="rounded-full border-slate-200/80 dark:border-slate-700/80 hover:bg-slate-100 dark:hover:bg-slate-800">
                      <Eye className="w-3.5 h-3.5 mr-1 text-brand-600 dark:text-brand-400" /> Receipt
                    </Button>
                  </Link>
                </div>
              </div>

              {/* Items Summary */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {order.items?.map((item) => (
                  <div
                    key={item.id}
                    className="p-3.5 rounded-2xl glass-card bg-slate-50/60 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/60 flex items-center gap-3.5 shadow-sm"
                  >
                    <div className="w-12 h-12 rounded-xl bg-white dark:bg-slate-900 overflow-hidden flex-shrink-0 flex items-center justify-center border border-slate-200/60 dark:border-slate-700/60">
                      {item.product_image ? (
                        <img src={item.product_image} alt={item.product_name} className="w-full h-full object-cover" />
                      ) : (
                        <ShoppingBag className="w-5 h-5 text-slate-400" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white truncate">{item.product_name}</h4>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        Size <strong className="text-slate-800 dark:text-slate-200">{item.size}</strong> × {item.qty} units
                      </p>
                    </div>
                    <span className="text-xs font-black text-slate-900 dark:text-white">
                      ${Number(item.total_price || item.unit_price * item.qty).toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>

              {/* Notes & Pickup Notice */}
              {order.notes && (
                <div className="p-3.5 rounded-2xl glass-card bg-brand-500/5 dark:bg-brand-500/10 border border-brand-500/20 text-xs text-slate-600 dark:text-slate-300 flex items-center gap-2.5">
                  <MapPin className="w-4 h-4 text-brand-600 dark:text-brand-400 flex-shrink-0" />
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
