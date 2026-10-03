import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ShieldCheck,
  Search,
  CheckCircle,
  XCircle,
  Package,
  DollarSign,
  TrendingUp,
  Clock,
  RefreshCw,
  ShoppingBag,
  Eye,
  AlertTriangle,
} from 'lucide-react';
import { useAuth } from '../../lib/AuthContext';
import { useToast } from '../../components/ui/Toast';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Input } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
import api from '../../lib/api';

export default function OfficerOrdersPage() {
  const { isOfficer } = useAuth();
  const toast = useToast();
  const queryClient = useQueryClient();

  const [selectedStatus, setSelectedStatus] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [cancelModalOrder, setCancelModalOrder] = useState(null);
  const [cancelReason, setCancelReason] = useState('');

  // Fetch all orders for officer management
  const { data: orders, isLoading, error, refetch } = useQuery({
    queryKey: ['officerOrders', selectedStatus, searchQuery],
    queryFn: async () => {
      const params = {};
      if (selectedStatus !== 'all') params.status = selectedStatus;
      if (searchQuery.trim()) params.search = searchQuery.trim();
      const res = await api.get('/orders/', { params });
      return res.data?.results || res.data || [];
    },
    staleTime: 1000 * 10,
  });

  // Fulfillment Mutation
  const fulfillMutation = useMutation({
    mutationFn: async (orderId) => {
      const res = await api.post(`/orders/${orderId}/fulfill/`);
      return res.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['officerOrders'] });
      queryClient.invalidateQueries({ queryKey: ['myOrders'] });
      toast.success(data.message || 'Order marked as fulfilled!');
      if (selectedOrder) setSelectedOrder(null);
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Failed to fulfill order.');
    },
  });

  // Cancellation Mutation (restores inventory)
  const cancelMutation = useMutation({
    mutationFn: async ({ orderId, reason }) => {
      const res = await api.post(`/orders/${orderId}/cancel/`, { reason });
      return res.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['officerOrders'] });
      queryClient.invalidateQueries({ queryKey: ['myOrders'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['officerInventory'] });
      toast.success('Order cancelled and item inventory restored to stock.');
      setCancelModalOrder(null);
      setCancelReason('');
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Failed to cancel order.');
    },
  });

  // Computed Metrics
  const metrics = React.useMemo(() => {
    if (!Array.isArray(orders)) return { totalRevenue: 0, paidOrders: 0, pendingOrders: 0, fulfilledOrders: 0 };
    const paid = orders.filter((o) => o.status === 'paid');
    const fulfilled = orders.filter((o) => o.status === 'fulfilled');
    const pending = orders.filter((o) => o.status === 'pending');
    const revenue = [...paid, ...fulfilled].reduce((sum, o) => sum + Number(o.total || 0), 0);

    return {
      totalRevenue: revenue,
      paidOrders: paid.length,
      fulfilledOrders: fulfilled.length,
      pendingOrders: pending.length,
    };
  }, [orders]);

  const getStatusBadge = (status) => {
    switch (status?.toLowerCase()) {
      case 'paid':
        return <Badge variant="success" className="rounded-full px-3">Paid / Ready for Pickup</Badge>;
      case 'fulfilled':
        return <Badge variant="accent" className="rounded-full px-3">Fulfilled</Badge>;
      case 'pending':
        return <Badge variant="warning" className="rounded-full px-3">Pending Payment</Badge>;
      case 'cancelled':
        return <Badge variant="danger" className="rounded-full px-3">Cancelled</Badge>;
      default:
        return <Badge variant="neutral" className="rounded-full px-3">{status}</Badge>;
    }
  };

  return (
    <div className="max-w-7xl mx-auto pb-20 space-y-8 animate-fadeIn">
      {/* Officer Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/60 dark:border-slate-800/60 pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <Badge variant="accent" size="sm" className="rounded-full font-bold px-3 py-1">
              <ShieldCheck className="w-3.5 h-3.5 mr-1" /> Officer Control Desk
            </Badge>
          </div>
          <h1 className="text-2xl sm:text-4xl font-extrabold text-slate-900 dark:text-white">Store Order Management & Fulfillment</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Manage student merchandise orders, verify payments, and mark customer pickups as fulfilled.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link to="/store/manage/inventory">
            <Button variant="outline" size="sm" className="rounded-full font-bold border-slate-200/80 dark:border-slate-700/80 hover:bg-slate-100 dark:hover:bg-slate-800">
              <Package className="w-4 h-4 mr-1.5 text-brand-600 dark:text-brand-400" /> Live Inventory Desk
            </Button>
          </Link>
          <Button variant="secondary" size="sm" onClick={() => refetch()} className="rounded-full border-slate-200/80 dark:border-slate-700/80">
            <RefreshCw className="w-4 h-4 mr-1.5 text-slate-500" /> Refresh
          </Button>
        </div>
      </div>

      {/* KPI Overview Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-6 rounded-3xl glass-panel border-white/40 dark:border-slate-800/80 shadow-lg">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Total Merch Revenue</span>
          <div className="flex items-center justify-between mt-3">
            <span className="text-3xl font-black text-slate-900 dark:text-white">${metrics.totalRevenue.toFixed(2)}</span>
            <div className="p-3 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <DollarSign className="w-6 h-6" />
            </div>
          </div>
        </div>

        <div className="p-6 rounded-3xl glass-panel border-white/40 dark:border-slate-800/80 shadow-lg">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Awaiting Pickup (Paid)</span>
          <div className="flex items-center justify-between mt-3">
            <span className="text-3xl font-black text-amber-600 dark:text-amber-400">{metrics.paidOrders}</span>
            <div className="p-3 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <Clock className="w-6 h-6" />
            </div>
          </div>
        </div>

        <div className="p-6 rounded-3xl glass-panel border-white/40 dark:border-slate-800/80 shadow-lg">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Fulfilled Orders</span>
          <div className="flex items-center justify-between mt-3">
            <span className="text-3xl font-black text-brand-600 dark:text-brand-300">{metrics.fulfilledOrders}</span>
            <div className="p-3 rounded-2xl bg-brand-500/10 text-brand-600 dark:text-brand-300">
              <CheckCircle className="w-6 h-6" />
            </div>
          </div>
        </div>

        <div className="p-6 rounded-3xl glass-panel border-white/40 dark:border-slate-800/80 shadow-lg">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Pending Payment</span>
          <div className="flex items-center justify-between mt-3">
            <span className="text-3xl font-black text-slate-900 dark:text-white">{metrics.pendingOrders}</span>
            <div className="p-3 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
              <ShoppingBag className="w-6 h-6" />
            </div>
          </div>
        </div>
      </div>

      {/* Filter and Search Controls */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 glass-card bg-slate-100/70 dark:bg-slate-900/60 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800/80">
        <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0 scrollbar-none">
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
              {st === 'all' ? 'All Orders' : st === 'paid' ? 'Paid (Ready)' : st}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search buyer, email, or order #..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white/80 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500 dark:focus:ring-brand-400 transition-all font-medium"
          />
        </div>
      </div>

      {/* Orders Management Table */}
      {isLoading ? (
        <div className="p-12 text-center text-slate-400 animate-pulse">Loading orders...</div>
      ) : orders.length === 0 ? (
        <div className="text-center py-20 glass-panel rounded-3xl border border-white/40 dark:border-slate-800/80 shadow-2xl p-8 space-y-3">
          <Package className="w-12 h-12 text-slate-400 mx-auto" />
          <h3 className="text-xl font-bold text-slate-900 dark:text-white">No Orders Found</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">There are no customer orders matching your selected filters.</p>
        </div>
      ) : (
        <div className="glass-panel rounded-3xl border border-white/40 dark:border-slate-800/80 shadow-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200/60 dark:border-slate-800/60 bg-slate-50/50 dark:bg-slate-900/50 text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">
                  <th className="py-4 px-5">Order #</th>
                  <th className="py-4 px-5">Buyer Details</th>
                  <th className="py-4 px-5">Items Summary</th>
                  <th className="py-4 px-5">Total</th>
                  <th className="py-4 px-5">Provider</th>
                  <th className="py-4 px-5">Status</th>
                  <th className="py-4 px-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-600 dark:text-slate-300">
                {orders.map((order) => (
                  <tr key={order.id} className="hover:bg-brand-500/5 dark:hover:bg-brand-500/10 transition-colors">
                    {/* Order ID & Date */}
                    <td className="py-4 px-5 font-mono font-bold text-slate-900 dark:text-white whitespace-nowrap">
                      #{order.id}
                      <span className="block text-[10px] text-slate-400 font-normal">
                        {new Date(order.created_at).toLocaleDateString()}
                      </span>
                    </td>

                    {/* Buyer Details */}
                    <td className="py-4 px-5">
                      <strong className="text-slate-900 dark:text-white block truncate max-w-[150px]">
                        {order.buyer_name || order.buyer_username || 'Guest'}
                      </strong>
                      <span className="text-[11px] text-slate-500 dark:text-slate-400 block truncate max-w-[150px]">
                        {order.buyer_email || 'N/A'}
                      </span>
                    </td>

                    {/* Items Summary */}
                    <td className="py-4 px-5 max-w-xs">
                      <div className="space-y-1">
                        {order.items?.slice(0, 2).map((item) => (
                          <div key={item.id} className="text-slate-900 dark:text-slate-200 truncate">
                            <span className="font-bold text-brand-600 dark:text-brand-400">{item.qty}x</span> {item.product_name} ({item.size})
                          </div>
                        ))}
                        {order.items?.length > 2 && (
                          <span className="text-[10px] text-brand-600 dark:text-brand-400 font-bold">
                            +{order.items.length - 2} more item(s)
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Total Amount */}
                    <td className="py-4 px-5 font-black text-slate-900 dark:text-white whitespace-nowrap">
                      ${Number(order.total).toFixed(2)}
                      {Number(order.discount_amount) > 0 && (
                        <span className="block text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">
                          -${Number(order.discount_amount).toFixed(2)} member disc.
                        </span>
                      )}
                    </td>

                    {/* Payment Provider */}
                    <td className="py-4 px-5 whitespace-nowrap">
                      <Badge variant="neutral" size="sm" className="rounded-full text-[10px] px-2.5">
                        {order.payment_provider === 'stripe' ? 'Stripe Card' : 'Mock / Offline'}
                      </Badge>
                    </td>

                    {/* Status */}
                    <td className="py-4 px-5 whitespace-nowrap">
                      {getStatusBadge(order.status)}
                    </td>

                    {/* Actions */}
                    <td className="py-4 px-5 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-2">
                        {order.status === 'paid' && (
                          <Button
                            variant="primary"
                            size="sm"
                            className="rounded-full bg-gradient-to-r from-brand-600 to-indigo-600 text-white font-bold"
                            isLoading={fulfillMutation.isPending}
                            onClick={() => fulfillMutation.mutate(order.id)}
                            title="Mark as handed over to student"
                          >
                            <CheckCircle className="w-3.5 h-3.5 mr-1" /> Fulfill
                          </Button>
                        )}

                        {['pending', 'paid'].includes(order.status) && (
                          <Button
                            variant="danger"
                            size="sm"
                            className="rounded-full"
                            onClick={() => setCancelModalOrder(order)}
                            title="Cancel order and restore inventory"
                          >
                            <XCircle className="w-3.5 h-3.5" />
                          </Button>
                        )}

                        <Button
                          variant="ghost"
                          size="sm"
                          className="rounded-full text-slate-400 hover:text-slate-900 dark:hover:text-white"
                          onClick={() => setSelectedOrder(order)}
                          title="View order receipt"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Receipt Details Modal */}
      <Modal
        isOpen={!!selectedOrder}
        onClose={() => setSelectedOrder(null)}
        title={selectedOrder ? `Order #${selectedOrder.id} Receipt Details` : ''}
        maxWidth="max-w-lg"
      >
        {selectedOrder && (
          <div className="space-y-4 text-xs">
            <div className="p-4 rounded-2xl glass-card bg-slate-50/70 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 flex justify-between items-center">
              <div>
                <p className="font-extrabold text-slate-900 dark:text-white text-sm">{selectedOrder.buyer_name || 'Guest'}</p>
                <p className="text-slate-500 dark:text-slate-400">{selectedOrder.buyer_email || 'No email'}</p>
              </div>
              <Badge variant={selectedOrder.status === 'fulfilled' ? 'accent' : 'success'} className="rounded-full px-3">
                {selectedOrder.status_display || selectedOrder.status}
              </Badge>
            </div>

            <div className="space-y-2">
              <h4 className="font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Ordered Items</h4>
              <div className="divide-y divide-slate-100 dark:divide-slate-800 border-y border-slate-200/60 dark:border-slate-800/60">
                {selectedOrder.items?.map((item) => (
                  <div key={item.id} className="py-3 flex justify-between items-center">
                    <div>
                      <strong className="text-slate-900 dark:text-white font-bold">{item.product_name}</strong>
                      <span className="block text-slate-500 dark:text-slate-400">Size: {item.size} × {item.qty} units</span>
                    </div>
                    <span className="font-black text-slate-900 dark:text-white">${Number(item.total_price || item.unit_price * item.qty).toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-1.5 pt-2 border-t border-slate-200/60 dark:border-slate-800/60">
              <div className="flex justify-between text-slate-500 dark:text-slate-400">
                <span>Subtotal</span>
                <span className="font-semibold text-slate-900 dark:text-white">${Number(selectedOrder.subtotal).toFixed(2)}</span>
              </div>
              {Number(selectedOrder.discount_amount) > 0 && (
                <div className="flex justify-between text-emerald-600 dark:text-emerald-400 font-medium">
                  <span>Member Savings ({Number(selectedOrder.discount_pct)}%)</span>
                  <span>-${Number(selectedOrder.discount_amount).toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between text-sm font-bold text-slate-900 dark:text-white pt-2 border-t border-slate-200/60 dark:border-slate-800/60">
                <span>Total Paid</span>
                <span className="text-brand-600 dark:text-brand-300 text-lg font-black">${Number(selectedOrder.total).toFixed(2)}</span>
              </div>
            </div>

            {selectedOrder.notes && (
              <div className="p-3.5 rounded-2xl glass-card bg-brand-500/5 dark:bg-brand-500/10 border border-brand-500/20 text-[11px] text-slate-600 dark:text-slate-300">
                <strong className="text-slate-900 dark:text-white">Notes:</strong> {selectedOrder.notes}
              </div>
            )}

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-200/60 dark:border-slate-800/60">
              {selectedOrder.status === 'paid' && (
                <Button
                  variant="primary"
                  size="sm"
                  className="rounded-full bg-gradient-to-r from-brand-600 to-indigo-600 text-white font-bold"
                  onClick={() => fulfillMutation.mutate(selectedOrder.id)}
                >
                  <CheckCircle className="w-4 h-4 mr-1.5" /> Fulfill Order
                </Button>
              )}
              <Button variant="secondary" size="sm" onClick={() => setSelectedOrder(null)} className="rounded-full">
                Close
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Cancel Order Confirmation Modal */}
      <Modal
        isOpen={!!cancelModalOrder}
        onClose={() => setCancelModalOrder(null)}
        title={cancelModalOrder ? `Cancel Order #${cancelModalOrder.id}?` : ''}
        maxWidth="max-w-md"
      >
        {cancelModalOrder && (
          <div className="space-y-4 text-xs">
            <div className="p-4 rounded-2xl glass-card bg-rose-500/10 border border-rose-300/40 dark:border-rose-900/50 text-rose-800 dark:text-rose-300">
              <p className="font-bold">Warning: Cancelling will restore items to live inventory.</p>
              <p className="mt-1">Order #{cancelModalOrder.id} for {cancelModalOrder.buyer_name} will be marked as Cancelled.</p>
            </div>

            <Input
              label="Cancellation Reason (Optional)"
              placeholder="e.g. Student requested refund, out of stock..."
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
            />

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-200/60 dark:border-slate-800/60">
              <Button variant="secondary" size="sm" onClick={() => setCancelModalOrder(null)} className="rounded-full">
                Keep Order
              </Button>
              <Button
                variant="danger"
                size="sm"
                className="rounded-full font-bold"
                isLoading={cancelMutation.isPending}
                onClick={() => cancelMutation.mutate({ orderId: cancelModalOrder.id, reason: cancelReason })}
              >
                Confirm Cancellation
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
