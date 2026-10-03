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
        return <Badge variant="success" className="bg-emerald-50 text-emerald-800 border-emerald-200">Paid / Ready for Pickup</Badge>;
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
    <div className="max-w-7xl mx-auto pb-20 space-y-8">
      {/* Officer Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <Badge variant="accent" size="sm" className="bg-[#714B67]/10 text-[#714B67] border-[#714B67]/20 font-semibold">
              <ShieldCheck className="w-3.5 h-3.5 mr-1" /> Officer Control Desk
            </Badge>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#222222]">Store Order Management & Fulfillment</h1>
          <p className="text-sm text-[#66636A] mt-0.5">
            Manage student merchandise orders, verify payments, and mark customer pickups as fulfilled.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link to="/store/manage/inventory">
            <Button variant="outline" size="sm" className="border-border text-[#222222] hover:bg-white font-medium">
              <Package className="w-4 h-4 mr-1.5 text-[#714B67]" /> Live Inventory Desk
            </Button>
          </Link>
          <Button variant="secondary" size="sm" onClick={() => refetch()} className="border-border bg-white text-[#222222] hover:bg-[#FAF9F7]">
            <RefreshCw className="w-4 h-4 mr-1.5 text-[#66636A]" /> Refresh
          </Button>
        </div>
      </div>

      {/* KPI Overview Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-white border border-border shadow-odoo-card">
          <span className="text-xs font-semibold uppercase tracking-wider text-[#66636A]">Total Merch Revenue</span>
          <div className="flex items-center justify-between mt-2">
            <span className="text-2xl font-black text-[#222222]">${metrics.totalRevenue.toFixed(2)}</span>
            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-border shadow-odoo-card">
          <span className="text-xs font-semibold uppercase tracking-wider text-[#66636A]">Awaiting Pickup (Paid)</span>
          <div className="flex items-center justify-between mt-2">
            <span className="text-2xl font-black text-amber-600">{metrics.paidOrders}</span>
            <div className="p-2 rounded-xl bg-amber-50 text-amber-600">
              <Clock className="w-5 h-5" />
            </div>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-border shadow-odoo-card">
          <span className="text-xs font-semibold uppercase tracking-wider text-[#66636A]">Fulfilled Orders</span>
          <div className="flex items-center justify-between mt-2">
            <span className="text-2xl font-black text-[#714B67]">{metrics.fulfilledOrders}</span>
            <div className="p-2 rounded-xl bg-[#714B67]/10 text-[#714B67]">
              <CheckCircle className="w-5 h-5" />
            </div>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-border shadow-odoo-card">
          <span className="text-xs font-semibold uppercase tracking-wider text-[#66636A]">Pending Payment</span>
          <div className="flex items-center justify-between mt-2">
            <span className="text-2xl font-black text-[#222222]">{metrics.pendingOrders}</span>
            <div className="p-2 rounded-xl bg-[#FAF9F7] text-[#66636A] border border-border">
              <ShoppingBag className="w-5 h-5" />
            </div>
          </div>
        </div>
      </div>

      {/* Filter and Search Controls */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-border shadow-sm">
        <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0 scrollbar-none">
          {['all', 'paid', 'fulfilled', 'pending', 'cancelled'].map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setSelectedStatus(st)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold capitalize transition-all whitespace-nowrap ${
                selectedStatus === st
                  ? 'bg-[#714B67] text-white shadow-sm'
                  : 'bg-[#FAF9F7] text-[#66636A] hover:text-[#222222] border border-border'
              }`}
            >
              {st === 'all' ? 'All Orders' : st === 'paid' ? 'Paid (Ready)' : st}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-[#66636A] absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search buyer, email, or order #..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#FAF9F7] border border-border rounded-xl pl-9 pr-4 py-2 text-xs text-[#222222] placeholder-[#66636A] focus:outline-none focus:ring-2 focus:ring-[#714B67]"
          />
        </div>
      </div>

      {/* Orders Management Table */}
      {isLoading ? (
        <div className="p-12 text-center text-[#66636A] animate-pulse">Loading orders...</div>
      ) : orders.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-3xl border border-border shadow-odoo-card p-8 space-y-3">
          <Package className="w-12 h-12 text-[#66636A] mx-auto" />
          <h3 className="text-lg font-bold text-[#222222]">No Orders Found</h3>
          <p className="text-xs text-[#66636A]">There are no customer orders matching your selected filters.</p>
        </div>
      ) : (
        <div className="bg-white rounded-3xl border border-border shadow-odoo-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-border bg-[#FAF9F7] text-[#66636A] font-semibold uppercase tracking-wider">
                  <th className="py-3.5 px-4">Order #</th>
                  <th className="py-3.5 px-4">Buyer Details</th>
                  <th className="py-3.5 px-4">Items Summary</th>
                  <th className="py-3.5 px-4">Total</th>
                  <th className="py-3.5 px-4">Provider</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border text-[#66636A]">
                {orders.map((order) => (
                  <tr key={order.id} className="hover:bg-[#FAF9F7]/70 transition-colors">
                    {/* Order ID & Date */}
                    <td className="py-4 px-4 font-mono font-bold text-[#222222] whitespace-nowrap">
                      #{order.id}
                      <span className="block text-[10px] text-[#66636A] font-normal">
                        {new Date(order.created_at).toLocaleDateString()}
                      </span>
                    </td>

                    {/* Buyer Details */}
                    <td className="py-4 px-4">
                      <strong className="text-[#222222] block truncate max-w-[150px]">
                        {order.buyer_name || order.buyer_username || 'Guest'}
                      </strong>
                      <span className="text-[11px] text-[#66636A] block truncate max-w-[150px]">
                        {order.buyer_email || 'N/A'}
                      </span>
                    </td>

                    {/* Items Summary */}
                    <td className="py-4 px-4 max-w-xs">
                      <div className="space-y-1">
                        {order.items?.slice(0, 2).map((item) => (
                          <div key={item.id} className="text-[#222222] truncate">
                            <span className="font-semibold text-[#714B67]">{item.qty}x</span> {item.product_name} ({item.size})
                          </div>
                        ))}
                        {order.items?.length > 2 && (
                          <span className="text-[10px] text-[#714B67] font-semibold">
                            +{order.items.length - 2} more item(s)
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Total Amount */}
                    <td className="py-4 px-4 font-bold text-[#222222] whitespace-nowrap">
                      ${Number(order.total).toFixed(2)}
                      {Number(order.discount_amount) > 0 && (
                        <span className="block text-[10px] text-emerald-600">
                          -${Number(order.discount_amount).toFixed(2)} member disc.
                        </span>
                      )}
                    </td>

                    {/* Payment Provider */}
                    <td className="py-4 px-4 whitespace-nowrap">
                      <Badge variant="neutral" size="sm" className="bg-[#FAF9F7] text-[#66636A] border-border text-[10px]">
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
                            className="bg-[#714B67] hover:bg-[#5B3B52] text-white"
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
                          className="text-[#66636A] hover:text-[#222222]"
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
            <div className="p-3.5 rounded-xl bg-[#FAF9F7] border border-border flex justify-between items-center">
              <div>
                <p className="font-bold text-[#222222] text-sm">{selectedOrder.buyer_name || 'Guest'}</p>
                <p className="text-[#66636A]">{selectedOrder.buyer_email || 'No email'}</p>
              </div>
              <Badge variant={selectedOrder.status === 'fulfilled' ? 'accent' : 'success'} className={selectedOrder.status === 'fulfilled' ? 'bg-[#017E84]/10 text-[#017E84] border-[#017E84]/20' : 'bg-emerald-50 text-emerald-800 border-emerald-200'}>
                {selectedOrder.status_display || selectedOrder.status}
              </Badge>
            </div>

            <div className="space-y-2">
              <h4 className="font-semibold text-[#66636A] uppercase tracking-wider">Ordered Items</h4>
              <div className="divide-y divide-border border-y border-border">
                {selectedOrder.items?.map((item) => (
                  <div key={item.id} className="py-2.5 flex justify-between items-center">
                    <div>
                      <strong className="text-[#222222]">{item.product_name}</strong>
                      <span className="block text-[#66636A]">Size: {item.size} × {item.qty} units</span>
                    </div>
                    <span className="font-bold text-[#222222]">${Number(item.total_price || item.unit_price * item.qty).toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-1.5 pt-2 border-t border-border">
              <div className="flex justify-between text-[#66636A]">
                <span>Subtotal</span>
                <span>${Number(selectedOrder.subtotal).toFixed(2)}</span>
              </div>
              {Number(selectedOrder.discount_amount) > 0 && (
                <div className="flex justify-between text-emerald-600 font-medium">
                  <span>Member Savings ({Number(selectedOrder.discount_pct)}%)</span>
                  <span>-${Number(selectedOrder.discount_amount).toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between text-sm font-bold text-[#222222] pt-2 border-t border-border">
                <span>Total Paid</span>
                <span className="text-[#714B67] text-base font-extrabold">${Number(selectedOrder.total).toFixed(2)}</span>
              </div>
            </div>

            {selectedOrder.notes && (
              <div className="p-3 rounded-xl bg-[#FAF9F7] border border-border text-[11px] text-[#66636A]">
                <strong className="text-[#222222]">Notes:</strong> {selectedOrder.notes}
              </div>
            )}

            <div className="flex justify-end gap-2 pt-3 border-t border-border">
              {selectedOrder.status === 'paid' && (
                <Button
                  variant="primary"
                  size="sm"
                  className="bg-[#714B67] hover:bg-[#5B3B52] text-white"
                  onClick={() => fulfillMutation.mutate(selectedOrder.id)}
                >
                  <CheckCircle className="w-4 h-4 mr-1.5" /> Fulfill Order
                </Button>
              )}
              <Button variant="secondary" size="sm" onClick={() => setSelectedOrder(null)} className="border-border">
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
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800">
              <p className="font-bold">Warning: Cancelling will restore items to live inventory.</p>
              <p className="mt-1">Order #{cancelModalOrder.id} for {cancelModalOrder.buyer_name} will be marked as Cancelled.</p>
            </div>

            <Input
              label="Cancellation Reason (Optional)"
              placeholder="e.g. Student requested refund, out of stock..."
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
            />

            <div className="flex justify-end gap-2 pt-3 border-t border-border">
              <Button variant="secondary" size="sm" onClick={() => setCancelModalOrder(null)} className="border-border">
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
