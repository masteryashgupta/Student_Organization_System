import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ShoppingBag, X, Trash2, Plus, Minus, CreditCard, CheckCircle2, ShieldCheck, ArrowRight } from 'lucide-react';
import { useCart } from './CartContext';
import { useAuth } from '../../lib/AuthContext';
import { useToast } from '../../components/ui/Toast';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Input } from '../../components/ui/Input';
import api from '../../lib/api';

export default function CartDrawer() {
  const { items, totalItems, subtotal, updateQty, removeFromCart, clearCart, isDrawerOpen, closeDrawer } = useCart();
  const { user, isAuthenticated } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [paymentProvider, setPaymentProvider] = useState('mock'); // 'mock' or 'stripe'
  const [buyerName, setBuyerName] = useState('');
  const [buyerEmail, setBuyerEmail] = useState('');
  const [notes, setNotes] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  // Fetch Member Discount from Contract Endpoint
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
    staleTime: 1000 * 60 * 5,
  });

  const discountPct = memberDiscountData?.is_active_member ? Number(memberDiscountData?.merch_discount_pct || 0) : 0;
  const discountAmount = Number(((subtotal * discountPct) / 100).toFixed(2));
  const totalPayable = Math.max(0, subtotal - discountAmount);

  const handleCheckout = async (e) => {
    e.preventDefault();
    if (items.length === 0) return;

    setIsProcessing(true);
    try {
      // 1. Create Pending Order
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

      // 2. Process Payment via Selected Provider
      await api.post(`/orders/${createdOrder.id}/pay/`, {
        provider: paymentProvider,
        payment_reference: paymentProvider === 'mock' ? 'INSTANT_STORE_CHECKOUT' : undefined,
      });

      // 3. Clear cart & invalidate live products cache
      clearCart();
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });

      toast.success(`Order #${createdOrder.id} successfully placed & paid!`);
      closeDrawer();
      navigate(`/store/orders`);
    } catch (err) {
      const errorMsg =
        err.response?.data?.message?.items ||
        err.response?.data?.message?.stock_qty ||
        err.response?.data?.message ||
        err.response?.data?.details ||
        'Failed to process order. Please verify stock availability.';
      toast.error(typeof errorMsg === 'string' ? errorMsg : JSON.stringify(errorMsg));
    } finally {
      setIsProcessing(false);
    }
  };

  if (!isDrawerOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden animate-fadeIn">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-md transition-opacity"
        onClick={closeDrawer}
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md glass-panel bg-white/95 dark:bg-slate-900/95 border-l border-white/40 dark:border-slate-800/80 shadow-2xl flex flex-col justify-between backdrop-blur-2xl">
          
          {/* Header */}
          <div className="p-5 border-b border-slate-200/60 dark:border-slate-800/60 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-purple-500/10 dark:bg-purple-500/20 text-[#714B67] dark:text-purple-300 border border-purple-500/20 shadow-sm">
                <ShoppingBag className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-slate-900 dark:text-white">Your Cart</h3>
                <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">{totalItems} {totalItems === 1 ? 'item' : 'items'} selected</span>
              </div>
            </div>
            <button
              type="button"
              onClick={closeDrawer}
              className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Cart Items List */}
          <div className="flex-1 overflow-y-auto p-5 space-y-3.5 bg-slate-50/50 dark:bg-slate-950/40">
            {items.length === 0 ? (
              <div className="text-center py-16">
                <div className="w-16 h-16 rounded-3xl bg-purple-500/10 dark:bg-purple-500/20 flex items-center justify-center mx-auto mb-4 text-[#714B67] dark:text-purple-300 shadow-inner">
                  <ShoppingBag className="w-8 h-8" />
                </div>
                <h4 className="text-base font-bold text-slate-900 dark:text-white">Your cart is empty</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-xs mx-auto">
                  Explore our merchandise catalog and pick your club apparel and accessories.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-6 rounded-full px-5 border-slate-200/80 dark:border-slate-700/80"
                  onClick={() => {
                    closeDrawer();
                    navigate('/store');
                  }}
                >
                  Browse Store
                </Button>
              </div>
            ) : (
              items.map((item) => (
                <div
                  key={item.variantId}
                  className="p-4 rounded-2xl glass-card bg-white/80 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800/80 shadow-md flex items-center gap-3.5"
                >
                  {/* Thumbnail */}
                  <div className="w-16 h-16 rounded-xl bg-slate-100 dark:bg-slate-800 overflow-hidden flex-shrink-0 flex items-center justify-center border border-slate-200/60 dark:border-slate-700/60">
                    {item.image ? (
                      <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-[10px] font-bold text-slate-400">{item.type?.toUpperCase()}</span>
                    )}
                  </div>

                  {/* Info & Quantity Stepper */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white truncate">{item.name}</h4>
                      <button
                        type="button"
                        onClick={() => removeFromCart(item.variantId)}
                        className="text-slate-400 hover:text-rose-500 p-1 transition-colors"
                        title="Remove item"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="neutral" size="sm" className="bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border-slate-200/60 dark:border-slate-700/60 text-[10px] rounded-md px-2 py-0.5">
                        Size {item.size}
                      </Badge>
                      <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">${item.price.toFixed(2)}</span>
                    </div>

                    <div className="flex items-center justify-between mt-3">
                      <div className="flex items-center border border-slate-200/80 dark:border-slate-700/80 rounded-xl bg-slate-50 dark:bg-slate-800/80 px-1 py-0.5 shadow-inner">
                        <button
                          type="button"
                          onClick={() => updateQty(item.variantId, item.qty - 1)}
                          className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <span className="px-2 text-xs font-bold text-slate-900 dark:text-white">{item.qty}</span>
                        <button
                          type="button"
                          onClick={() => updateQty(item.variantId, item.qty + 1)}
                          disabled={item.qty >= item.stock_qty}
                          className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <span className="text-sm font-black text-[#714B67] dark:text-purple-300">
                        ${(item.price * item.qty).toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer with Checkout Form & Summary */}
          {items.length > 0 && (
            <div className="p-5 border-t border-slate-200/60 dark:border-slate-800/60 bg-white/90 dark:bg-slate-900/90 space-y-4">
              {/* Member Discount Notification */}
              {discountPct > 0 ? (
                <div className="p-3 rounded-2xl glass-card bg-emerald-500/10 border border-emerald-300/40 dark:border-emerald-700/50 flex items-center justify-between text-xs text-emerald-950 dark:text-emerald-200">
                  <div className="flex items-center gap-1.5 font-bold">
                    <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    <span>Member Discount ({discountPct}%) Applied</span>
                  </div>
                  <span className="font-extrabold text-emerald-600 dark:text-emerald-400">-${discountAmount.toFixed(2)}</span>
                </div>
              ) : isAuthenticated ? (
                <div className="p-2.5 rounded-2xl glass-card bg-slate-100/70 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-between">
                  <span>Standard Member Pricing</span>
                  <Link to="/members" className="text-[#714B67] dark:text-purple-400 font-bold hover:underline">
                    Upgrade for 15% off
                  </Link>
                </div>
              ) : null}

              {/* Price Calculation */}
              <div className="space-y-1.5 text-xs text-slate-500 dark:text-slate-400 border-b border-slate-200/60 dark:border-slate-800/60 pb-3">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span className="text-slate-900 dark:text-white font-bold">${subtotal.toFixed(2)}</span>
                </div>
                {discountAmount > 0 && (
                  <div className="flex justify-between text-emerald-600 dark:text-emerald-400 font-medium">
                    <span>Member Discount</span>
                    <span>-${discountAmount.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm font-bold text-slate-900 dark:text-white pt-1">
                  <span>Total Payable</span>
                  <span className="text-[#714B67] dark:text-purple-300 text-lg font-black">${totalPayable.toFixed(2)}</span>
                </div>
              </div>

              {/* Payment Method Selector */}
              <div>
                <label className="text-xs font-bold text-slate-900 dark:text-white block mb-2">Payment Method</label>
                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setPaymentProvider('mock')}
                    className={`p-3 rounded-2xl border text-xs font-bold flex flex-col items-center gap-1.5 transition-all ${
                      paymentProvider === 'mock'
                        ? 'bg-purple-500/10 dark:bg-purple-500/20 border-[#714B67] dark:border-purple-400 text-[#714B67] dark:text-purple-300 ring-1 ring-[#714B67]'
                        : 'glass-card bg-white/70 dark:bg-slate-900/60 border-slate-200/80 dark:border-slate-800/80 text-slate-500 dark:text-slate-400 hover:border-purple-300'
                    }`}
                  >
                    <CheckCircle2 className="w-4 h-4 text-[#714B67] dark:text-purple-400" />
                    <span>Instant / Cash</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentProvider('stripe')}
                    className={`p-3 rounded-2xl border text-xs font-bold flex flex-col items-center gap-1.5 transition-all ${
                      paymentProvider === 'stripe'
                        ? 'bg-purple-500/10 dark:bg-purple-500/20 border-[#714B67] dark:border-purple-400 text-[#714B67] dark:text-purple-300 ring-1 ring-[#714B67]'
                        : 'glass-card bg-white/70 dark:bg-slate-900/60 border-slate-200/80 dark:border-slate-800/80 text-slate-500 dark:text-slate-400 hover:border-purple-300'
                    }`}
                  >
                    <CreditCard className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                    <span>Card (Stripe Test)</span>
                  </button>
                </div>
              </div>

              {/* Checkout Button */}
              <Button
                variant="primary"
                size="lg"
                className="w-full rounded-full bg-gradient-to-r from-[#714B67] to-[#8C5D80] hover:from-[#5B3B52] hover:to-[#714B67] text-white shadow-lg shadow-purple-500/20 font-bold active:scale-95 transition-transform"
                isLoading={isProcessing}
                onClick={handleCheckout}
              >
                <span>Complete Order (${totalPayable.toFixed(2)})</span>
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
