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
        <div className="w-16 h-16 bg-gray-200 rounded-2xl mx-auto" />
        <div className="h-6 bg-gray-200 rounded w-1/3 mx-auto" />
        <div className="h-4 bg-gray-100 rounded w-1/2 mx-auto" />
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="max-w-md mx-auto py-16 text-center bg-white rounded-3xl border border-border shadow-odoo-card p-10 space-y-4">
        <h2 className="text-xl font-bold text-[#222222]">Order Not Found</h2>
        <p className="text-sm text-[#66636A]">We could not retrieve order details for #{id}.</p>
        <Link to="/store">
          <Button variant="primary" className="bg-[#714B67] hover:bg-[#5B3B52] text-white">
            Return to Store
          </Button>
        </Link>
      </div>
    );
  }

  const items = order.items || [];

  return (
    <div className="max-w-3xl mx-auto pb-20 space-y-8">
      {/* Success Celebration Card */}
      <div className="text-center p-8 sm:p-10 rounded-3xl bg-white border border-emerald-200 shadow-odoo-card space-y-4 relative overflow-hidden">
        <div className="w-20 h-20 rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center mx-auto shadow-sm">
          <CheckCircle2 className="w-10 h-10" />
        </div>

        <div className="space-y-1">
          <span className="text-xs font-extrabold text-emerald-700 uppercase tracking-widest">
            Payment Approved & Order Confirmed
          </span>
          <h1 className="text-3xl sm:text-4xl font-black text-[#222222]">Thank You for Your Order!</h1>
          <p className="text-sm text-[#66636A] max-w-md mx-auto">
            Order <strong className="text-[#714B67]">#{order.id}</strong> has been received and verified. Your items are reserved in club inventory.
          </p>
        </div>

        <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
          <Link to="/store/orders">
            <Button variant="primary" size="md" className="bg-[#714B67] hover:bg-[#5B3B52] text-white">
              <span>View in My Orders</span>
              <ArrowRight className="w-4 h-4 ml-1.5" />
            </Button>
          </Link>

          <Button
            variant="outline"
            size="md"
            onClick={() => window.print()}
            className="print:hidden border-border text-[#222222] hover:bg-[#FAF9F7]"
          >
            <Printer className="w-4 h-4 mr-1.5 text-[#66636A]" /> Print Receipt
          </Button>
        </div>
      </div>

      {/* Pickup Instructions Card */}
      <div className="p-6 rounded-2xl bg-[#FAF9F7] border border-[#714B67]/20 flex items-start gap-4 shadow-sm">
        <div className="p-2.5 rounded-xl bg-[#714B67]/10 text-[#714B67] flex-shrink-0">
          <MapPin className="w-6 h-6" />
        </div>
        <div className="space-y-1">
          <h3 className="text-base font-bold text-[#222222]">Pickup Instructions</h3>
          <p className="text-xs sm:text-sm text-[#66636A] leading-relaxed">
            Your items will be ready for pickup at the <strong className="text-[#222222]">Skyline Student Center (Room 204)</strong> or at the next general club meeting. Please present your Student ID or show this order confirmation screen.
          </p>
        </div>
      </div>

      {/* Digital Receipt Breakdown */}
      <div className="p-6 sm:p-8 rounded-3xl bg-white border border-border shadow-odoo-card space-y-6">
        <div className="flex items-center justify-between border-b border-border pb-4">
          <div>
            <h2 className="text-lg font-bold text-[#222222]">Digital Order Receipt</h2>
            <p className="text-xs text-[#66636A] mt-0.5">Order #{order.id} • Placed {new Date(order.created_at).toLocaleString()}</p>
          </div>
          <Badge variant="success" size="md" className="bg-emerald-50 text-emerald-800 border-emerald-200">
            {order.status_display || order.status?.toUpperCase()}
          </Badge>
        </div>

        {/* Customer & Payment Info Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs bg-[#FAF9F7] p-4 rounded-2xl border border-border">
          <div>
            <span className="text-[#66636A] uppercase tracking-wider font-semibold block mb-0.5">Customer</span>
            <p className="font-bold text-[#222222] text-sm">{order.buyer_name || order.buyer_username || 'Club Member'}</p>
            <p className="text-[#66636A]">{order.buyer_email || 'No email specified'}</p>
          </div>

          <div>
            <span className="text-[#66636A] uppercase tracking-wider font-semibold block mb-0.5">Payment Method</span>
            <p className="font-bold text-[#222222] text-sm capitalize">
              {order.payment_provider === 'stripe' ? 'Credit Card (Stripe Test)' : 'Instant / Mock Provider'}
            </p>
            {order.payment_reference && (
              <p className="text-[#66636A] font-mono text-[11px] truncate">Ref: {order.payment_reference}</p>
            )}
          </div>
        </div>

        {/* Itemized Table */}
        <div className="space-y-3">
          <h3 className="text-xs font-bold text-[#66636A] uppercase tracking-wider">Ordered Items</h3>
          <div className="divide-y divide-border border-y border-border">
            {items.map((item) => (
              <div key={item.id} className="py-3 flex items-center justify-between gap-4 text-xs">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-lg bg-canvas overflow-hidden flex items-center justify-center flex-shrink-0 border border-border">
                    {item.product_image ? (
                      <img src={item.product_image} alt={item.product_name} className="w-full h-full object-cover" />
                    ) : (
                      <ShoppingBag className="w-5 h-5 text-[#66636A]" />
                    )}
                  </div>
                  <div>
                    <h4 className="font-bold text-[#222222] text-sm">{item.product_name}</h4>
                    <span className="text-[#66636A]">
                      Size: <strong className="text-[#222222]">{item.size}</strong> × {item.qty} units
                    </span>
                  </div>
                </div>

                <div className="text-right">
                  <span className="font-bold text-[#222222] text-sm">
                    ${Number(item.total_price || item.unit_price * item.qty).toFixed(2)}
                  </span>
                  <span className="text-[11px] text-[#66636A] block">${Number(item.unit_price).toFixed(2)} / unit</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Total Cost Breakdown */}
        <div className="space-y-2 text-xs text-[#66636A] border-t border-border pt-4">
          <div className="flex justify-between">
            <span>Subtotal</span>
            <span className="text-[#222222] font-semibold">${Number(order.subtotal).toFixed(2)}</span>
          </div>
          {Number(order.discount_amount) > 0 && (
            <div className="flex justify-between text-emerald-600 font-medium">
              <span>Member Discount ({Number(order.discount_pct)}%)</span>
              <span>-${Number(order.discount_amount).toFixed(2)}</span>
            </div>
          )}
          <div className="flex justify-between text-base font-extrabold text-[#222222] border-t border-border pt-3">
            <span>Amount Paid</span>
            <span className="text-[#714B67] text-xl font-black">${Number(order.total).toFixed(2)}</span>
          </div>
        </div>

        {/* Back Link */}
        <div className="pt-4 border-t border-border flex justify-between items-center text-xs text-[#66636A]">
          <Link to="/store" className="text-[#714B67] hover:text-[#5B3B52] font-semibold flex items-center gap-1">
            <ShoppingBag className="w-3.5 h-3.5" /> Continue Shopping Store
          </Link>
          <span>Skyline Student Association</span>
        </div>
      </div>
    </div>
  );
}
