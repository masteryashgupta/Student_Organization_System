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
      <div className="max-w-xl mx-auto py-16 text-center glass-panel rounded-3xl border border-white/40 dark:border-slate-800/80 shadow-2xl p-10 space-y-4 animate-fadeIn">
        <div className="w-16 h-16 rounded-3xl bg-purple-500/10 dark:bg-purple-500/20 flex items-center justify-center mx-auto text-[#714B67] dark:text-purple-300 shadow-inner">
          <ShoppingBag className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white">Your Shopping Cart is Empty</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
          You have no items in your cart. Explore our official club hoodies, shirts, caps, and gear!
        </p>
        <Link to="/store">
          <Button variant="primary" className="mt-4 rounded-full px-8 bg-gradient-to-r from-[#714B67] to-[#8C5D80] hover:from-[#5B3B52] hover:to-[#714B67] text-white font-bold shadow-lg shadow-purple-500/20">
            Explore Store Catalog
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto pb-20 space-y-8 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/60 dark:border-slate-800/60 pb-5">
        <div>
          <h1 className="text-2xl sm:text-4xl font-extrabold text-slate-900 dark:text-white">Shopping Cart & Checkout</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{totalItems} {totalItems === 1 ? 'item' : 'items'} ready for checkout</p>
        </div>
        <Link to="/store" className="text-xs font-bold text-[#714B67] dark:text-purple-400 hover:underline flex items-center gap-1.5 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Continue Shopping
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Cart Item Rows */}
        <div className="lg:col-span-7 space-y-4">
          {items.map((item) => (
            <div
              key={item.variantId}
              className="p-5 rounded-3xl glass-card bg-white/80 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800/80 shadow-lg flex items-center justify-between gap-4 transition-all hover:border-purple-300 dark:hover:border-purple-700"
            >
              <div className="w-20 h-20 rounded-2xl bg-slate-100 dark:bg-slate-800 overflow-hidden flex-shrink-0 border border-slate-200/60 dark:border-slate-700/60 flex items-center justify-center shadow-inner">
                {item.image ? (
                  <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-xs font-bold text-slate-400">
                    {item.type?.toUpperCase()}
                  </div>
                )}
              </div>

              <div className="flex-1 min-w-0">
                <h3 className="text-base font-extrabold text-slate-900 dark:text-white truncate">{item.name}</h3>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="neutral" size="sm" className="bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border-slate-200/60 dark:border-slate-700/60 text-[11px] rounded-md px-2.5">
                    Size {item.size}
                  </Badge>
                  <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">${item.price.toFixed(2)} each</span>
                </div>

                <div className="flex items-center gap-3 mt-3">
                  <div className="flex items-center border border-slate-200/80 dark:border-slate-700/80 rounded-xl bg-slate-50 dark:bg-slate-800/80 px-1 py-0.5 shadow-inner">
                    <button
                      type="button"
                      onClick={() => updateQty(item.variantId, item.qty - 1)}
                      className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
                      title="Decrease quantity"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <span className="px-2.5 text-xs font-bold text-slate-900 dark:text-white">{item.qty}</span>
                    <button
                      type="button"
                      onClick={() => updateQty(item.variantId, item.qty + 1)}
                      disabled={item.qty >= item.stock_qty}
                      className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 disabled:opacity-30 transition-colors"
                      title="Increase quantity"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => removeFromCart(item.variantId)}
                    className="text-xs text-rose-500 hover:text-rose-600 hover:underline inline-flex items-center gap-1 font-bold transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Remove
                  </button>
                </div>
              </div>

              <div className="text-right">
                <span className="text-lg font-black text-[#714B67] dark:text-purple-300">
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
            className="p-6 sm:p-8 rounded-3xl glass-panel border-white/40 dark:border-slate-800/80 space-y-6 shadow-2xl sticky top-6 backdrop-blur-2xl"
          >
            <h2 className="text-xl font-extrabold text-slate-900 dark:text-white border-b border-slate-200/60 dark:border-slate-800/60 pb-3">Order Summary</h2>

            {/* Member Discount Notice */}
            {discountPct > 0 ? (
              <div className="p-3.5 rounded-2xl glass-card bg-emerald-500/10 border border-emerald-300/40 dark:border-emerald-700/50 flex items-center justify-between text-xs text-emerald-950 dark:text-emerald-200">
                <span className="font-bold flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  Member Discount ({discountPct}%)
                </span>
                <span className="font-black text-emerald-600 dark:text-emerald-400">-${discountAmount.toFixed(2)}</span>
              </div>
            ) : null}

            {/* Price Calculations */}
            <div className="space-y-2 text-sm text-slate-500 dark:text-slate-400">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span className="text-slate-900 dark:text-white font-bold">${subtotal.toFixed(2)}</span>
              </div>
              {discountAmount > 0 && (
                <div className="flex justify-between text-emerald-600 dark:text-emerald-400 font-medium">
                  <span>Savings</span>
                  <span>-${discountAmount.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between text-lg font-bold text-slate-900 dark:text-white border-t border-slate-200/60 dark:border-slate-800/60 pt-3">
                <span>Total Due</span>
                <span className="text-[#714B67] dark:text-purple-300 text-2xl font-black">${totalPayable.toFixed(2)}</span>
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
              <label className="text-xs font-bold text-slate-900 dark:text-white block">Payment Method</label>
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => setPaymentProvider('mock')}
                  className={`p-3.5 rounded-2xl border text-xs font-bold flex flex-col items-center gap-1.5 transition-all ${
                    paymentProvider === 'mock'
                      ? 'bg-purple-500/10 dark:bg-purple-500/20 border-[#714B67] dark:border-purple-400 text-[#714B67] dark:text-purple-300 ring-1 ring-[#714B67]'
                      : 'glass-card bg-slate-50/50 dark:bg-slate-800/40 border-slate-200/80 dark:border-slate-700/80 text-slate-500 dark:text-slate-400 hover:border-purple-300'
                  }`}
                >
                  <CheckCircle2 className="w-5 h-5 text-[#714B67] dark:text-purple-400" />
                  <span>Instant / Cash</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentProvider('stripe')}
                  className={`p-3.5 rounded-2xl border text-xs font-bold flex flex-col items-center gap-1.5 transition-all ${
                    paymentProvider === 'stripe'
                      ? 'bg-purple-500/10 dark:bg-purple-500/20 border-[#714B67] dark:border-purple-400 text-[#714B67] dark:text-purple-300 ring-1 ring-[#714B67]'
                      : 'glass-card bg-slate-50/50 dark:bg-slate-800/40 border-slate-200/80 dark:border-slate-700/80 text-slate-500 dark:text-slate-400 hover:border-purple-300'
                  }`}
                >
                  <CreditCard className="w-5 h-5 text-teal-600 dark:text-teal-400" />
                  <span>Stripe Test Mode</span>
                </button>
              </div>
            </div>

            {/* Checkout CTA */}
            <Button
              type="submit"
              variant="primary"
              size="lg"
              className="w-full rounded-full bg-gradient-to-r from-[#714B67] to-[#8C5D80] hover:from-[#5B3B52] hover:to-[#714B67] text-white shadow-lg shadow-purple-500/20 font-bold active:scale-95 transition-transform"
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
