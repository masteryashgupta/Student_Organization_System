import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { CheckCircle2, ShoppingBag, ArrowRight, Printer, Sparkles, Package, MapPin, Calendar, CreditCard } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import api from '../../lib/api';

export default function OrderConfirmationPage() {
  const { id } = useParams();

  const { data: order, isLoading, error } = useQuery({
    queryKey: ['orderConfirmation', id],
    queryFn: async () => {
      const res = await api.get(`/orders/${id}/`);
      return res.data;
    },
  });

  if (isLoading) {
    return (
      <div className="max-w-3xl mx-auto py-20 text-center animate-pulse space-y-4">
        <div className="w-16 h-16 bg-slate-800 rounded-full mx-auto" />
        <div className="h-6 bg-slate-800 rounded w-1/3 mx-auto" />
        <div className="h-4 bg-slate-800 rounded w-1/2 mx-auto" />
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="max-w-md mx-auto py-20 text-center bg-surface-900 rounded-3xl border border-slate-800 p-8 space-y-4">
        <h2 className="text-xl font-bold text-white">Order Not Found</h2>
        <p className="text-sm text-slate-400">We could not retrieve order details for #{id}.</p>
        <Link to="/store">
          <Button variant="primary">Return to Store</Button>
        </Link>
      </div>
    );
  }

  const items = order.items || [];

  return (
    <div className="max-w-3xl mx-auto pb-20 space-y-8">
      {/* Success Celebration Card */}
      <div className="text-center p-8 sm:p-10 rounded-3xl bg-gradient-to-b from-surface-900 to-surface-950 border border-emerald-500/30 shadow-2xl space-y-4 relative overflow-hidden">
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="w-20 h-20 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/20">
          <CheckCircle2 className="w-10 h-10" />
        </div>

        <div className="space-y-1">
          <span className="text-xs font-extrabold text-emerald-400 uppercase tracking-widest">
            Payment Approved & Order Confirmed
          </span>
          <h1 className="text-3xl sm:text-4xl font-black text-white">Thank You for Your Order!</h1>
          <p className="text-sm text-slate-300 max-w-md mx-auto">
            Order <strong className="text-brand-300">#{order.id}</strong> has been received and verified. Your items are reserved in club inventory.
          </p>
        </div>

        <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
          <Link to="/store/orders">
            <Button variant="primary" size="md">
              <span>View in My Orders</span>
              <ArrowRight className="w-4 h-4 ml-1.5" />
            </Button>
          </Link>

          <Button
            variant="outline"
            size="md"
            onClick={() => window.print()}
            className="print:hidden"
          >
            <Printer className="w-4 h-4 mr-1.5" /> Print Receipt
          </Button>
        </div>
      </div>

      {/* Pickup Instructions Card */}
      <div className="p-6 rounded-2xl bg-surface-900 border border-brand-500/30 flex items-start gap-4">
        <div className="p-2.5 rounded-xl bg-brand-500/20 text-brand-400 flex-shrink-0">
          <MapPin className="w-6 h-6" />
        </div>
        <div className="space-y-1">
          <h3 className="text-base font-bold text-white">Pickup Instructions</h3>
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
            Your items will be ready for pickup at the <strong>Skyline Student Center (Room 204)</strong> or at the next general club meeting. Please present your Student ID or show this order confirmation screen.
          </p>
        </div>
      </div>

      {/* Digital Receipt Breakdown */}
      <div className="p-6 sm:p-8 rounded-3xl bg-surface-900 border border-slate-800 shadow-xl space-y-6">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div>
            <h2 className="text-lg font-bold text-white">Digital Order Receipt</h2>
            <p className="text-xs text-slate-400 mt-0.5">Order #{order.id} • Placed {new Date(order.created_at).toLocaleString()}</p>
          </div>
          <Badge variant="success" size="md">
            {order.status_display || order.status?.toUpperCase()}
          </Badge>
        </div>

        {/* Customer & Payment Info Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs bg-surface-950/60 p-4 rounded-2xl border border-slate-800">
          <div>
            <span className="text-slate-500 uppercase tracking-wider font-semibold block mb-0.5">Customer</span>
            <p className="font-bold text-white text-sm">{order.buyer_name || order.buyer_username || 'Club Member'}</p>
            <p className="text-slate-400">{order.buyer_email || 'No email specified'}</p>
          </div>

          <div>
            <span className="text-slate-500 uppercase tracking-wider font-semibold block mb-0.5">Payment Method</span>
            <p className="font-bold text-white text-sm capitalize">
              {order.payment_provider === 'stripe' ? 'Credit Card (Stripe Test)' : 'Instant / Mock Provider'}
            </p>
            {order.payment_reference && (
              <p className="text-slate-400 font-mono text-[11px] truncate">Ref: {order.payment_reference}</p>
            )}
          </div>
        </div>

        {/* Itemized Table */}
        <div className="space-y-3">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Ordered Items</h3>
          <div className="divide-y divide-slate-800 border-y border-slate-800">
            {items.map((item) => (
              <div key={item.id} className="py-3 flex items-center justify-between gap-4 text-xs">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-lg bg-slate-800 overflow-hidden flex items-center justify-center flex-shrink-0">
                    {item.product_image ? (
                      <img src={item.product_image} alt={item.product_name} className="w-full h-full object-cover" />
                    ) : (
                      <ShoppingBag className="w-5 h-5 text-slate-500" />
                    )}
                  </div>
                  <div>
                    <h4 className="font-bold text-white text-sm">{item.product_name}</h4>
                    <span className="text-slate-400">
                      Size: <strong className="text-slate-200">{item.size}</strong> × {item.qty} units
                    </span>
                  </div>
                </div>

                <div className="text-right">
                  <span className="font-bold text-white text-sm">
                    ${Number(item.total_price || item.unit_price * item.qty).toFixed(2)}
                  </span>
                  <span className="text-[11px] text-slate-400 block">${Number(item.unit_price).toFixed(2)} / unit</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Total Cost Breakdown */}
        <div className="space-y-2 text-xs text-slate-300 border-t border-slate-800 pt-4">
          <div className="flex justify-between">
            <span>Subtotal</span>
            <span>${Number(order.subtotal).toFixed(2)}</span>
          </div>
          {Number(order.discount_amount) > 0 && (
            <div className="flex justify-between text-emerald-400">
              <span>Member Discount ({Number(order.discount_pct)}%)</span>
              <span>-${Number(order.discount_amount).toFixed(2)}</span>
            </div>
          )}
          <div className="flex justify-between text-base font-extrabold text-white border-t border-slate-800 pt-3">
            <span>Amount Paid</span>
            <span className="text-brand-300 text-lg">${Number(order.total).toFixed(2)}</span>
          </div>
        </div>

        {/* Back Link */}
        <div className="pt-4 border-t border-slate-800 flex justify-between items-center text-xs text-slate-400">
          <Link to="/store" className="text-brand-400 hover:underline font-semibold flex items-center gap-1">
            <ShoppingBag className="w-3.5 h-3.5" /> Continue Shopping Store
          </Link>
          <span>Skyline Student Association</span>
        </div>
      </div>
    </div>
  );
}
