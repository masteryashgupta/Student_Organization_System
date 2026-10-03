import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
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
      const payRes = await api.post(`/orders/${createdOrder.id}/pay/`, {
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
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
        onClick={closeDrawer}
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-surface-900 border-l border-slate-800 shadow-2xl flex flex-col justify-between">
          
          {/* Header */}
          <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-surface-950/60">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-brand-600/20 text-brand-400">
                <ShoppingBag className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Your Cart</h3>
                <span className="text-xs text-slate-400">{totalItems} {totalItems === 1 ? 'item' : 'items'} selected</span>
              </div>
            </div>
            <button
              onClick={closeDrawer}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Cart Items List */}
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            {items.length === 0 ? (
              <div className="text-center py-16">
                <div className="w-16 h-16 rounded-full bg-slate-800/80 flex items-center justify-center mx-auto mb-4 text-slate-500">
                  <ShoppingBag className="w-8 h-8" />
                </div>
                <h4 className="text-base font-semibold text-slate-200">Your cart is empty</h4>
                <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">
                  Explore our merchandise catalog and pick your club apparel and accessories.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-6"
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
                  className="p-3.5 rounded-xl bg-surface-800/60 border border-slate-700/60 flex items-center gap-3.5"
                >
                  {/* Thumbnail */}
                  <div className="w-16 h-16 rounded-lg bg-slate-800 overflow-hidden flex-shrink-0 flex items-center justify-center border border-slate-700">
                    {item.image ? (
                      <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-xs font-bold text-slate-500">{item.type?.toUpperCase()}</span>
                    )}
                  </div>

                  {/* Info & Quantity Stepper */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="text-sm font-semibold text-white truncate">{item.name}</h4>
                      <button
                        onClick={() => removeFromCart(item.variantId)}
                        className="text-slate-500 hover:text-danger-400 p-1 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="neutral" size="sm">Size {item.size}</Badge>
                      <span className="text-xs font-medium text-slate-300">${item.price.toFixed(2)}</span>
                    </div>

                    <div className="flex items-center justify-between mt-3">
                      <div className="flex items-center border border-slate-700 rounded-lg bg-surface-900">
                        <button
                          onClick={() => updateQty(item.variantId, item.qty - 1)}
                          className="p-1 text-slate-400 hover:text-white transition-colors"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <span className="px-2.5 text-xs font-bold text-white">{item.qty}</span>
                        <button
                          onClick={() => updateQty(item.variantId, item.qty + 1)}
                          disabled={item.qty >= item.stock_qty}
                          className="p-1 text-slate-400 hover:text-white transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <span className="text-sm font-bold text-brand-300">
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
            <div className="p-5 border-t border-slate-800 bg-surface-950/80 space-y-4">
              {/* Member Discount Notification */}
              {discountPct > 0 ? (
                <div className="p-2.5 rounded-lg bg-emerald-950/40 border border-emerald-800/60 flex items-center justify-between text-xs text-emerald-300">
                  <div className="flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    <span>Member Discount ({discountPct}%) Applied</span>
                  </div>
                  <span className="font-bold text-emerald-400">-${discountAmount.toFixed(2)}</span>
                </div>
              ) : isAuthenticated ? (
                <div className="p-2 rounded-lg bg-slate-800/40 text-[11px] text-slate-400 flex items-center justify-between">
                  <span>Standard Member Pricing</span>
                  <Link to="/members" className="text-brand-400 font-semibold hover:underline">Upgrade for 15% off</Link>
                </div>
              ) : null}

              {/* Price Calculation */}
              <div className="space-y-1.5 text-xs text-slate-400 border-b border-slate-800 pb-3">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span className="text-slate-200 font-medium">${subtotal.toFixed(2)}</span>
                </div>
                {discountAmount > 0 && (
                  <div className="flex justify-between text-emerald-400">
                    <span>Member Discount</span>
                    <span>-${discountAmount.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm font-bold text-white pt-1">
                  <span>Total Payable</span>
                  <span className="text-brand-300 text-base">${totalPayable.toFixed(2)}</span>
                </div>
              </div>

              {/* Payment Method Selector */}
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1.5">Payment Method</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setPaymentProvider('mock')}
                    className={`p-2.5 rounded-xl border text-xs font-medium flex flex-col items-center gap-1 transition-all ${
                      paymentProvider === 'mock'
                        ? 'bg-brand-600/20 border-brand-500 text-white'
                        : 'bg-surface-800 border-slate-700 text-slate-400 hover:text-white'
                    }`}
                  >
                    <CheckCircle2 className="w-4 h-4 text-brand-400" />
                    <span>Instant / Cash</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentProvider('stripe')}
                    className={`p-2.5 rounded-xl border text-xs font-medium flex flex-col items-center gap-1 transition-all ${
                      paymentProvider === 'stripe'
                        ? 'bg-brand-600/20 border-brand-500 text-white'
                        : 'bg-surface-800 border-slate-700 text-slate-400 hover:text-white'
                    }`}
                  >
                    <CreditCard className="w-4 h-4 text-accent-400" />
                    <span>Card (Stripe Test)</span>
                  </button>
                </div>
              </div>

              {/* Checkout Button */}
              <Button
                variant="primary"
                size="lg"
                className="w-full shadow-lg shadow-brand-600/30"
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
