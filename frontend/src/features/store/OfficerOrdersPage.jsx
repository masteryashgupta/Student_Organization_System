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
        return <Badge variant="success">Paid / Ready for Pickup</Badge>;
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
    <div className="max-w-7xl mx-auto pb-20 space-y-8">
      {/* Officer Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Badge variant="accent" size="sm">
              <ShieldCheck className="w-3.5 h-3.5 mr-1" /> Officer Control Desk
            </Badge>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white">Store Order Management & Fulfillment</h1>
          <p className="text-sm text-slate-400 mt-0.5">
            Manage student merchandise orders, verify payments, and mark customer pickups as fulfilled.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link to="/store/manage/inventory">
            <Button variant="outline" size="sm">
              <Package className="w-4 h-4 mr-1.5 text-brand-400" /> Live Inventory Desk
            </Button>
          </Link>
          <Button variant="secondary" size="sm" onClick={() => refetch()}>
            <RefreshCw className="w-4 h-4 mr-1.5" /> Refresh
          </Button>
        </div>
      </div>

      {/* KPI Overview Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-surface-900 border border-slate-800 shadow-md">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Total Merch Revenue</span>
          <div className="flex items-center justify-between mt-2">
            <span className="text-2xl font-black text-white">${metrics.totalRevenue.toFixed(2)}</span>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-surface-900 border border-slate-800 shadow-md">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Awaiting Pickup (Paid)</span>
          <div className="flex items-center justify-between mt-2">
            <span className="text-2xl font-black text-amber-400">{metrics.paidOrders}</span>
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400">
              <Clock className="w-5 h-5" />
            </div>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-surface-900 border border-slate-800 shadow-md">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Fulfilled Orders</span>
          <div className="flex items-center justify-between mt-2">
            <span className="text-2xl font-black text-brand-400">{metrics.fulfilledOrders}</span>
            <div className="p-2 rounded-xl bg-brand-500/10 text-brand-400">
              <CheckCircle className="w-5 h-5" />
            </div>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-surface-900 border border-slate-800 shadow-md">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Pending Payment</span>
          <div className="flex items-center justify-between mt-2">
            <span className="text-2xl font-black text-slate-300">{metrics.pendingOrders}</span>
            <div className="p-2 rounded-xl bg-slate-800 text-slate-400">
              <ShoppingBag className="w-5 h-5" />
            </div>
          </div>
        </div>
      </div>

      {/* Filter and Search Controls */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-surface-900/60 p-4 rounded-2xl border border-slate-800">
        <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0 scrollbar-none">
          {['all', 'paid', 'fulfilled', 'pending', 'cancelled'].map((st) => (
            <button
              key={st}
              onClick={() => setSelectedStatus(st)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold capitalize transition-all whitespace-nowrap ${
                selectedStatus === st
                  ? 'bg-brand-600 text-white shadow-md'
                  : 'bg-surface-950 text-slate-400 hover:text-white border border-slate-800'
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
            className="w-full bg-surface-950 border border-slate-700/80 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>
      </div>

      {/* Orders Management Table */}
      {isLoading ? (
        <div className="p-12 text-center text-slate-400 animate-pulse">Loading orders...</div>
      ) : orders.length === 0 ? (
        <div className="text-center py-20 bg-surface-900 rounded-3xl border border-slate-800 p-8 space-y-3">
          <Package className="w-12 h-12 text-slate-500 mx-auto" />
          <h3 className="text-lg font-bold text-white">No Orders Found</h3>
          <p className="text-xs text-slate-400">There are no customer orders matching your selected filters.</p>
        </div>
      ) : (
        <div className="bg-surface-900 rounded-3xl border border-slate-800 shadow-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-800 bg-surface-950/60 text-slate-400 font-semibold uppercase tracking-wider">
                  <th className="py-3.5 px-4">Order #</th>
                  <th className="py-3.5 px-4">Buyer Details</th>
                  <th className="py-3.5 px-4">Items Summary</th>
                  <th className="py-3.5 px-4">Total</th>
                  <th className="py-3.5 px-4">Provider</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {orders.map((order) => (
                  <tr key={order.id} className="hover:bg-slate-800/30 transition-colors">
                    {/* Order ID & Date */}
                    <td className="py-4 px-4 font-mono font-bold text-white whitespace-nowrap">
                      #{order.id}
                      <span className="block text-[10px] text-slate-500 font-normal">
                        {new Date(order.created_at).toLocaleDateString()}
                      </span>
                    </td>

                    {/* Buyer Details */}
                    <td className="py-4 px-4">
                      <strong className="text-white block truncate max-w-[150px]">
                        {order.buyer_name || order.buyer_username || 'Guest'}
                      </strong>
                      <span className="text-[11px] text-slate-400 block truncate max-w-[150px]">
                        {order.buyer_email || 'N/A'}
                      </span>
                    </td>

                    {/* Items Summary */}
                    <td className="py-4 px-4 max-w-xs">
                      <div className="space-y-1">
                        {order.items?.slice(0, 2).map((item) => (
                          <div key={item.id} className="text-slate-300 truncate">
                            <span className="font-semibold text-white">{item.qty}x</span> {item.product_name} ({item.size})
                          </div>
                        ))}
                        {order.items?.length > 2 && (
                          <span className="text-[10px] text-brand-400 font-semibold">
                            +{order.items.length - 2} more item(s)
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Total Amount */}
                    <td className="py-4 px-4 font-bold text-white whitespace-nowrap">
                      ${Number(order.total).toFixed(2)}
                      {Number(order.discount_amount) > 0 && (
                        <span className="block text-[10px] text-emerald-400">
                          -${Number(order.discount_amount).toFixed(2)} member disc.
                        </span>
                      )}
                    </td>

                    {/* Payment Provider */}
                    <td className="py-4 px-4 whitespace-nowrap">
                      <Badge variant="neutral" size="sm">
                        {order.payment_provider === 'stripe' ? 'Stripe Card' : 'Mock / Offline'}
                      </Badge>
                    </td>

                    {/* Status */}
                    <td className="py-4 px-4 whitespace-nowrap">
                      {getStatusBadge(order.status)}
                    </td>

                    {/* Actions */}
                    <td className="py-4 px-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-2">
                        {order.status === 'paid' && (
                          <Button
                            variant="primary"
                            size="sm"
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
                            onClick={() => setCancelModalOrder(order)}
                            title="Cancel order and restore inventory"
                          >
                            <XCircle className="w-3.5 h-3.5" />
                          </Button>
                        )}

                        <Button
                          variant="ghost"
                          size="sm"
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
            <div className="p-3 rounded-xl bg-surface-950 border border-slate-800 flex justify-between items-center">
              <div>
                <p className="font-bold text-white text-sm">{selectedOrder.buyer_name || 'Guest'}</p>
                <p className="text-slate-400">{selectedOrder.buyer_email || 'No email'}</p>
              </div>
              <Badge variant={selectedOrder.status === 'fulfilled' ? 'accent' : 'success'}>
                {selectedOrder.status_display || selectedOrder.status}
              </Badge>
            </div>

            <div className="space-y-2">
              <h4 className="font-semibold text-slate-400 uppercase tracking-wider">Ordered Items</h4>
              <div className="divide-y divide-slate-800 border-y border-slate-800">
                {selectedOrder.items?.map((item) => (
                  <div key={item.id} className="py-2 flex justify-between items-center">
                    <div>
                      <strong className="text-white">{item.product_name}</strong>
                      <span className="block text-slate-400">Size: {item.size} × {item.qty} units</span>
                    </div>
                    <span className="font-bold text-white">${Number(item.total_price || item.unit_price * item.qty).toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-1 pt-2 border-t border-slate-800">
              <div className="flex justify-between text-slate-400">
                <span>Subtotal</span>
                <span>${Number(selectedOrder.subtotal).toFixed(2)}</span>
              </div>
              {Number(selectedOrder.discount_amount) > 0 && (
                <div className="flex justify-between text-emerald-400">
                  <span>Member Savings ({Number(selectedOrder.discount_pct)}%)</span>
                  <span>-${Number(selectedOrder.discount_amount).toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between text-sm font-bold text-white pt-2 border-t border-slate-800">
                <span>Total Paid</span>
                <span className="text-brand-300">${Number(selectedOrder.total).toFixed(2)}</span>
              </div>
            </div>

            {selectedOrder.notes && (
              <div className="p-2.5 rounded-lg bg-surface-950 border border-slate-800 text-[11px] text-slate-300">
                <strong>Notes:</strong> {selectedOrder.notes}
              </div>
            )}

            <div className="flex justify-end gap-2 pt-3">
              {selectedOrder.status === 'paid' && (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => fulfillMutation.mutate(selectedOrder.id)}
                >
                  <CheckCircle className="w-4 h-4 mr-1.5" /> Fulfill Order
                </Button>
              )}
              <Button variant="secondary" size="sm" onClick={() => setSelectedOrder(null)}>
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
            <div className="p-3 rounded-xl bg-danger-950/40 border border-danger-800/60 text-danger-300">
              <p className="font-bold">Warning: Cancelling will restore items to live inventory.</p>
              <p className="mt-1">Order #{cancelModalOrder.id} for {cancelModalOrder.buyer_name} will be marked as Cancelled.</p>
            </div>

            <Input
              label="Cancellation Reason (Optional)"
              placeholder="e.g. Student requested refund, out of stock..."
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
            />

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
              <Button variant="secondary" size="sm" onClick={() => setCancelModalOrder(null)}>
                Keep Order
              </Button>
              <Button
                variant="danger"
                size="sm"
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
