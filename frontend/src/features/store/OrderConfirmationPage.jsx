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
        <div className="w-16 h-16 bg-slate-200 dark:bg-slate-700 rounded-3xl mx-auto" />
        <div className="h-6 bg-slate-200 dark:bg-slate-700 rounded-lg w-1/3 mx-auto" />
        <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded-lg w-1/2 mx-auto" />
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="max-w-md mx-auto py-16 text-center glass-panel rounded-3xl border border-white/40 dark:border-slate-800/80 shadow-2xl p-10 space-y-4 animate-fadeIn">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">Order Not Found</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">We could not retrieve order details for #{id}.</p>
        <Link to="/store">
          <Button variant="primary" className="rounded-full px-6 bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 text-white">
            Return to Store
          </Button>
        </Link>
      </div>
    );
  }

  const items = order.items || [];

  return (
    <div className="max-w-3xl mx-auto pb-20 space-y-8 animate-fadeIn">
      {/* Success Celebration Card */}
      <div className="text-center p-8 sm:p-10 rounded-3xl glass-panel border-emerald-300/40 dark:border-emerald-700/50 shadow-2xl space-y-5 relative overflow-hidden bg-emerald-500/5">
        <div className="w-20 h-20 rounded-3xl bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/10">
          <CheckCircle2 className="w-10 h-10" />
        </div>

        <div className="space-y-1.5">
          <span className="text-xs font-extrabold text-emerald-600 dark:text-emerald-400 uppercase tracking-widest">
            Payment Approved & Order Confirmed
          </span>
          <h1 className="text-3xl sm:text-5xl font-black text-slate-900 dark:text-white">Thank You for Your Order!</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto leading-relaxed">
            Order <strong className="text-brand-600 dark:text-brand-300 font-mono">#{order.id}</strong> has been received and verified. Your items are reserved in club inventory.
          </p>
        </div>

        <div className="pt-3 flex flex-wrap items-center justify-center gap-3">
          <Link to="/store/orders">
            <Button variant="primary" size="md" className="rounded-full px-6 bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 text-white font-bold shadow-md shadow-brand-500/20">
              <span>View in My Orders</span>
              <ArrowRight className="w-4 h-4 ml-1.5" />
            </Button>
          </Link>

          <Button
            variant="outline"
            size="md"
            onClick={() => window.print()}
            className="print:hidden rounded-full px-5 border-slate-200/80 dark:border-slate-700/80 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <Printer className="w-4 h-4 mr-1.5 text-slate-500" /> Print Receipt
          </Button>
        </div>
      </div>

      {/* Pickup Instructions Card */}
      <div className="p-6 rounded-3xl glass-card bg-brand-500/5 dark:bg-brand-500/10 border border-brand-500/20 flex items-start gap-4 shadow-md">
        <div className="p-3 rounded-2xl bg-brand-500/20 text-brand-600 dark:text-brand-300 flex-shrink-0 shadow-sm">
          <MapPin className="w-6 h-6" />
        </div>
        <div className="space-y-1">
          <h3 className="text-base font-extrabold text-slate-900 dark:text-white">Pickup Instructions</h3>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
            Your items will be ready for pickup at the <strong className="text-slate-900 dark:text-white">Skyline Student Center (Room 204)</strong> or at the next general club meeting. Please present your Student ID or show this order confirmation screen.
          </p>
        </div>
      </div>

      {/* Digital Receipt Breakdown */}
      <div className="p-6 sm:p-8 rounded-3xl glass-panel border-white/40 dark:border-slate-800/80 shadow-2xl space-y-6 backdrop-blur-2xl">
        <div className="flex items-center justify-between border-b border-slate-200/60 dark:border-slate-800/60 pb-4">
          <div>
            <h2 className="text-xl font-extrabold text-slate-900 dark:text-white">Digital Order Receipt</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Order #{order.id} • Placed {new Date(order.created_at).toLocaleString()}</p>
          </div>
          <Badge variant="success" size="md" className="rounded-full px-3.5 shadow-sm">
            {order.status_display || order.status?.toUpperCase()}
          </Badge>
        </div>

        {/* Customer & Payment Info Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs glass-card bg-slate-50/70 dark:bg-slate-800/60 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-700/80">
          <div>
            <span className="text-slate-400 uppercase tracking-wider font-bold block mb-1">Customer</span>
            <p className="font-extrabold text-slate-900 dark:text-white text-sm">{order.buyer_name || order.buyer_username || 'Club Member'}</p>
            <p className="text-slate-500 dark:text-slate-400">{order.buyer_email || 'No email specified'}</p>
          </div>

          <div>
            <span className="text-slate-400 uppercase tracking-wider font-bold block mb-1">Payment Method</span>
            <p className="font-extrabold text-slate-900 dark:text-white text-sm capitalize">
              {order.payment_provider === 'stripe' ? 'Credit Card (Stripe Test)' : 'Instant / Mock Provider'}
            </p>
            {order.payment_reference && (
              <p className="text-slate-500 dark:text-slate-400 font-mono text-[11px] truncate mt-0.5">Ref: {order.payment_reference}</p>
            )}
          </div>
        </div>

        {/* Itemized Table */}
        <div className="space-y-3">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Ordered Items</h3>
          <div className="divide-y divide-slate-100 dark:divide-slate-800 border-y border-slate-200/60 dark:border-slate-800/60">
            {items.map((item) => (
              <div key={item.id} className="py-3.5 flex items-center justify-between gap-4 text-xs">
                <div className="flex items-center gap-3.5">
                  <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-800 overflow-hidden flex items-center justify-center flex-shrink-0 border border-slate-200/60 dark:border-slate-700/60">
                    {item.product_image ? (
                      <img src={item.product_image} alt={item.product_name} className="w-full h-full object-cover" />
                    ) : (
                      <ShoppingBag className="w-5 h-5 text-slate-400" />
                    )}
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 dark:text-white text-sm">{item.product_name}</h4>
                    <span className="text-slate-500 dark:text-slate-400">
                      Size: <strong className="text-slate-800 dark:text-slate-200">{item.size}</strong> × {item.qty} units
                    </span>
                  </div>
                </div>

                <div className="text-right">
                  <span className="font-black text-slate-900 dark:text-white text-sm">
                    ${Number(item.total_price || item.unit_price * item.qty).toFixed(2)}
                  </span>
                  <span className="text-[11px] text-slate-400 block">${Number(item.unit_price).toFixed(2)} / unit</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Total Cost Breakdown */}
        <div className="space-y-2 text-xs text-slate-500 dark:text-slate-400 border-t border-slate-200/60 dark:border-slate-800/60 pt-4">
          <div className="flex justify-between">
            <span>Subtotal</span>
            <span className="text-slate-900 dark:text-white font-bold">${Number(order.subtotal).toFixed(2)}</span>
          </div>
          {Number(order.discount_amount) > 0 && (
            <div className="flex justify-between text-emerald-600 dark:text-emerald-400 font-bold">
              <span>Member Discount ({Number(order.discount_pct)}%)</span>
              <span>-${Number(order.discount_amount).toFixed(2)}</span>
            </div>
          )}
          <div className="flex justify-between text-base font-extrabold text-slate-900 dark:text-white border-t border-slate-200/60 dark:border-slate-800/60 pt-3">
            <span>Amount Paid</span>
            <span className="text-brand-600 dark:text-brand-300 text-2xl font-black">${Number(order.total).toFixed(2)}</span>
          </div>
        </div>

        {/* Back Link */}
        <div className="pt-4 border-t border-slate-200/60 dark:border-slate-800/60 flex justify-between items-center text-xs text-slate-400">
          <Link to="/store" className="text-brand-600 dark:text-brand-400 hover:underline font-bold flex items-center gap-1">
            <ShoppingBag className="w-3.5 h-3.5" /> Continue Shopping Store
          </Link>
          <span>Skyline Student Association</span>
        </div>
      </div>
    </div>
  );
}
