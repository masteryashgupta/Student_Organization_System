import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ShoppingBag, ArrowLeft, Trash2, Plus, Minus, CreditCard, CheckCircle2, ShieldCheck, ArrowRight } from 'lucide-react';
import { useCart } from './CartContext';
import { useAuth } from '../../lib/AuthContext';
import { useToast } from '../../components/ui/Toast';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Input } from '../../components/ui/Input';
import api from '../../lib/api';

export default function CartPage() {
  const { items, totalItems, subtotal, updateQty, removeFromCart, clearCart } = useCart();
  const { user, isAuthenticated } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [paymentProvider, setPaymentProvider] = useState('mock');
  const [buyerName, setBuyerName] = useState('');
  const [buyerEmail, setBuyerEmail] = useState('');
  const [notes, setNotes] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  // Fetch Member Discount Contract
  // // MOCK /api/members/me: swap at integration
  const { data: memberDiscountData } = useQuery({
    queryKey: ['memberDiscount'],
    queryFn: async () => {
      try {
        const res = await api.get('/members/me');
        return res.data;
      } catch {
        return { is_active_member: false, merch_discount_pct: 0.00 };
      }
    },
    enabled: isAuthenticated,
  });

  const discountPct = memberDiscountData?.is_active_member ? Number(memberDiscountData?.merch_discount_pct || 0) : 0;
  const discountAmount = Number(((subtotal * discountPct) / 100).toFixed(2));
  const totalPayable = Math.max(0, subtotal - discountAmount);

  const handleCheckout = async (e) => {
    e.preventDefault();
    if (items.length === 0) return;

    setIsProcessing(true);
    try {
      const orderPayload = {
        items: items.map((i) => ({
          variant_id: i.variantId,
          qty: i.qty,
        })),
        buyer_name: buyerName || user?.name || user?.username || 'Club Member',
        buyer_email: buyerEmail || user?.email || '',
        notes,
      };

      const orderRes = await api.post('/orders/', orderPayload);
      const createdOrder = orderRes.data;

      await api.post(`/orders/${createdOrder.id}/pay/`, {
        provider: paymentProvider,
        payment_reference: paymentProvider === 'mock' ? 'INSTANT_STORE_CHECKOUT' : undefined,
      });

      clearCart();
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });

      toast.success(`Order #${createdOrder.id} successfully placed & paid!`);
      navigate('/store/orders');
    } catch (err) {
      const errorMsg =
        err.response?.data?.message?.items ||
        err.response?.data?.message?.stock_qty ||
        err.response?.data?.message ||
        'Failed to process order. Please check item stock.';
      toast.error(typeof errorMsg === 'string' ? errorMsg : JSON.stringify(errorMsg));
    } finally {
      setIsProcessing(false);
    }
  };

  if (items.length === 0) {
    return (
      <div className="max-w-xl mx-auto py-20 text-center bg-surface-900 rounded-3xl border border-slate-800 p-8 space-y-4">
        <div className="w-16 h-16 rounded-full bg-slate-800 flex items-center justify-center mx-auto text-slate-500">
          <ShoppingBag className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-white">Your Shopping Cart is Empty</h2>
        <p className="text-sm text-slate-400 max-w-sm mx-auto">
          You have no items in your cart. Check out the latest club hoodies and gear!
        </p>
        <Link to="/store">
          <Button variant="primary" className="mt-4">
            Explore Store
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto pb-20 space-y-8">
      <div className="flex items-center justify-between border-b border-slate-800 pb-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white">Shopping Cart & Checkout</h1>
          <p className="text-sm text-slate-400 mt-1">{totalItems} items ready for checkout</p>
        </div>
        <Link to="/store" className="text-xs font-semibold text-brand-400 hover:underline flex items-center gap-1">
          <ArrowLeft className="w-3.5 h-3.5" /> Continue Shopping
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Cart Item Rows */}
        <div className="lg:col-span-7 space-y-4">
          {items.map((item) => (
            <div
              key={item.variantId}
              className="p-4 rounded-2xl bg-surface-900 border border-slate-800 flex items-center justify-between gap-4"
            >
              <div className="w-20 h-20 rounded-xl bg-slate-950 overflow-hidden flex-shrink-0 border border-slate-800">
                {item.image ? (
                  <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-xs font-bold text-slate-600">
                    {item.type?.toUpperCase()}
                  </div>
                )}
              </div>

              <div className="flex-1 min-w-0">
                <h3 className="text-sm sm:text-base font-bold text-white truncate">{item.name}</h3>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="neutral" size="sm">Size {item.size}</Badge>
                  <span className="text-xs text-slate-400">${item.price.toFixed(2)} each</span>
                </div>

                <div className="flex items-center gap-3 mt-3">
                  <div className="flex items-center border border-slate-700 rounded-lg bg-surface-950">
                    <button
                      onClick={() => updateQty(item.variantId, item.qty - 1)}
                      className="p-1 text-slate-400 hover:text-white"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <span className="px-2.5 text-xs font-bold text-white">{item.qty}</span>
                    <button
                      onClick={() => updateQty(item.variantId, item.qty + 1)}
                      disabled={item.qty >= item.stock_qty}
                      className="p-1 text-slate-400 hover:text-white disabled:opacity-30"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <button
                    onClick={() => removeFromCart(item.variantId)}
                    className="text-xs text-danger-400 hover:underline inline-flex items-center gap-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Remove
                  </button>
                </div>
              </div>

              <div className="text-right">
                <span className="text-base sm:text-lg font-bold text-brand-300">
                  ${(item.price * item.qty).toFixed(2)}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Checkout Summary Card */}
        <div className="lg:col-span-5">
          <form
            onSubmit={handleCheckout}
            className="p-6 rounded-3xl bg-surface-900 border border-slate-800 space-y-6 shadow-xl sticky top-6"
          >
            <h2 className="text-lg font-bold text-white border-b border-slate-800 pb-3">Order Summary</h2>

            {/* Member Discount Notice */}
            {discountPct > 0 ? (
              <div className="p-3 rounded-xl bg-emerald-950/50 border border-emerald-800/60 flex items-center justify-between text-xs text-emerald-300">
                <span className="font-semibold">Member Discount ({discountPct}%)</span>
                <span className="font-bold text-emerald-400">-${discountAmount.toFixed(2)}</span>
              </div>
            ) : null}

            {/* Price Calculations */}
            <div className="space-y-2 text-sm text-slate-300">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span>${subtotal.toFixed(2)}</span>
              </div>
              {discountAmount > 0 && (
                <div className="flex justify-between text-emerald-400">
                  <span>Savings</span>
                  <span>-${discountAmount.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between text-lg font-bold text-white border-t border-slate-800 pt-3">
                <span>Total Due</span>
                <span className="text-brand-300">${totalPayable.toFixed(2)}</span>
              </div>
            </div>

            {/* Customer Inputs */}
            <div className="space-y-3">
              <Input
                label="Customer Name"
                placeholder="Student Name"
                value={buyerName}
                onChange={(e) => setBuyerName(e.target.value)}
              />
              <Input
                label="Email"
                type="email"
                placeholder="student@skyline.edu"
                value={buyerEmail}
                onChange={(e) => setBuyerEmail(e.target.value)}
              />
              <Input
                label="Order Notes (Optional)"
                placeholder="Pickup notes, delivery instructions..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>

            {/* Payment Method Selector */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-300 block">Payment Method</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setPaymentProvider('mock')}
                  className={`p-3 rounded-xl border text-xs font-medium flex flex-col items-center gap-1.5 transition-all ${
                    paymentProvider === 'mock'
                      ? 'bg-brand-600/20 border-brand-500 text-white'
                      : 'bg-surface-800 border-slate-700 text-slate-400 hover:text-white'
                  }`}
                >
                  <CheckCircle2 className="w-5 h-5 text-brand-400" />
                  <span>Instant / Cash</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentProvider('stripe')}
                  className={`p-3 rounded-xl border text-xs font-medium flex flex-col items-center gap-1.5 transition-all ${
                    paymentProvider === 'stripe'
                      ? 'bg-brand-600/20 border-brand-500 text-white'
                      : 'bg-surface-800 border-slate-700 text-slate-400 hover:text-white'
                  }`}
                >
                  <CreditCard className="w-5 h-5 text-accent-400" />
                  <span>Stripe Test Mode</span>
                </button>
              </div>
            </div>

            {/* Checkout CTA */}
            <Button
              type="submit"
              variant="primary"
              size="lg"
              className="w-full shadow-lg shadow-brand-600/30"
              isLoading={isProcessing}
            >
              <span>Pay & Place Order (${totalPayable.toFixed(2)})</span>
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
