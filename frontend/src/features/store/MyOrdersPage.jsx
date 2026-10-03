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
          <Badge variant="success" className="bg-emerald-50 text-emerald-800 border-emerald-200">
            Paid & Ready
          </Badge>
        );
      case 'fulfilled':
        return (
          <Badge variant="accent" className="bg-[#017E84]/10 text-[#017E84] border-[#017E84]/20">
            Fulfilled / Picked Up
          </Badge>
        );
      case 'pending':
        return (
          <Badge variant="warning" className="bg-amber-50 text-amber-800 border-amber-200">
            Pending Payment
          </Badge>
        );
      case 'cancelled':
        return (
          <Badge variant="danger" className="bg-rose-50 text-rose-800 border-rose-200">
            Cancelled
          </Badge>
        );
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
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#222222]">My Merch Orders</h1>
          <p className="text-sm text-[#66636A] mt-0.5">
            Track your apparel orders, payment receipts, and campus pickup status.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {isOfficer && (
            <Link to="/store/manage/orders">
              <Button variant="outline" size="sm" className="border-border text-[#222222] hover:bg-white font-medium">
                <ShieldCheck className="w-4 h-4 mr-1.5 text-[#714B67]" /> Officer Order Desk
              </Button>
            </Link>
          )}

          <Button variant="secondary" size="sm" onClick={() => refetch()} className="border-border bg-white text-[#222222] hover:bg-[#FAF9F7]">
            <RefreshCw className="w-4 h-4 mr-1.5 text-[#66636A]" /> Refresh
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
          Failed to load your orders. Please make sure you are signed in.
        </div>
      ) : orders.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-3xl border border-border shadow-odoo-card p-8 space-y-3">
          <div className="w-16 h-16 rounded-2xl bg-[#714B67]/10 flex items-center justify-center mx-auto text-[#714B67]">
            <Package className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-[#222222]">No Orders Found</h3>
          <p className="text-xs text-[#66636A] max-w-xs mx-auto">
            {selectedStatus !== 'all'
              ? `You have no orders matching status '${selectedStatus}'.`
              : 'You have not placed any store orders yet.'}
          </p>
          <Link to="/store">
            <Button variant="primary" size="sm" className="mt-4 bg-[#714B67] hover:bg-[#5B3B52] text-white">
              Browse Store Catalog
            </Button>
          </Link>
        </div>
      ) : (
        <div className="space-y-5">
          {orders.map((order) => (
            <div
              key={order.id}
              className="p-6 rounded-2xl bg-white border border-border shadow-odoo-card space-y-5 transition-all hover:border-[#714B67]/30"
            >
              {/* Header: Order ID, Status, Timestamp */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-4">
                <div>
                  <div className="flex items-center gap-2.5">
                    <span className="text-base font-extrabold text-[#222222]">Order #{order.id}</span>
                    {getStatusBadge(order.status)}
                    <Badge variant="neutral" size="sm" className="bg-[#FAF9F7] text-[#66636A] border-border text-[10px]">
                      {order.payment_provider === 'stripe' ? 'Credit Card' : 'Instant Mock'}
                    </Badge>
                  </div>
                  <p className="text-xs text-[#66636A] mt-1">
                    Placed on {new Date(order.created_at).toLocaleString()}
                  </p>
                </div>

                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <span className="text-xs text-[#66636A] block">Total Paid</span>
                    <span className="text-xl font-black text-[#714B67]">${Number(order.total).toFixed(2)}</span>
                  </div>

                  <Link to={`/store/orders/${order.id}/confirmation`}>
                    <Button variant="outline" size="sm" className="border-border text-[#222222] hover:bg-[#FAF9F7]">
                      <Eye className="w-3.5 h-3.5 mr-1 text-[#714B67]" /> Receipt
                    </Button>
                  </Link>
                </div>
              </div>

              {/* Items Summary */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {order.items?.map((item) => (
                  <div
                    key={item.id}
                    className="p-3 rounded-xl bg-[#FAF9F7] border border-border flex items-center gap-3"
                  >
                    <div className="w-12 h-12 rounded-lg bg-white overflow-hidden flex-shrink-0 flex items-center justify-center border border-border">
                      {item.product_image ? (
                        <img src={item.product_image} alt={item.product_name} className="w-full h-full object-cover" />
                      ) : (
                        <ShoppingBag className="w-5 h-5 text-[#66636A]" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-xs font-bold text-[#222222] truncate">{item.product_name}</h4>
                      <p className="text-[11px] text-[#66636A]">
                        Size <strong className="text-[#222222]">{item.size}</strong> × {item.qty} units
                      </p>
                    </div>
                    <span className="text-xs font-bold text-[#222222]">
                      ${Number(item.total_price || item.unit_price * item.qty).toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>

              {/* Notes & Pickup Notice */}
              {order.notes && (
                <div className="p-3 rounded-xl bg-[#FAF9F7] border border-border text-xs text-[#66636A] flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-[#714B67] flex-shrink-0" />
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
