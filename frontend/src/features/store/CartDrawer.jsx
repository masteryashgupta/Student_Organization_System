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
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-[#222222]/40 backdrop-blur-sm transition-opacity"
        onClick={closeDrawer}
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-white border-l border-border shadow-2xl flex flex-col justify-between">
          
          {/* Header */}
          <div className="p-5 border-b border-border flex items-center justify-between bg-canvas">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-[#714B67]/10 text-[#714B67]">
                <ShoppingBag className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-[#222222]">Your Cart</h3>
                <span className="text-xs text-[#66636A]">{totalItems} {totalItems === 1 ? 'item' : 'items'} selected</span>
              </div>
            </div>
            <button
              type="button"
              onClick={closeDrawer}
              className="p-1.5 text-[#66636A] hover:text-[#222222] rounded-lg hover:bg-gray-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Cart Items List */}
          <div className="flex-1 overflow-y-auto p-5 space-y-3.5 bg-[#FAF9F7]/50">
            {items.length === 0 ? (
              <div className="text-center py-16">
                <div className="w-16 h-16 rounded-2xl bg-[#714B67]/10 flex items-center justify-center mx-auto mb-4 text-[#714B67]">
                  <ShoppingBag className="w-8 h-8" />
                </div>
                <h4 className="text-base font-bold text-[#222222]">Your cart is empty</h4>
                <p className="text-xs text-[#66636A] mt-1 max-w-xs mx-auto">
                  Explore our merchandise catalog and pick your club apparel and accessories.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-6 border-border text-[#222222] hover:bg-white"
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
                  className="p-3.5 rounded-2xl bg-white border border-border shadow-sm flex items-center gap-3.5"
                >
                  {/* Thumbnail */}
                  <div className="w-16 h-16 rounded-xl bg-canvas overflow-hidden flex-shrink-0 flex items-center justify-center border border-border">
                    {item.image ? (
                      <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-[10px] font-bold text-[#66636A]">{item.type?.toUpperCase()}</span>
                    )}
                  </div>

                  {/* Info & Quantity Stepper */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="text-sm font-bold text-[#222222] truncate">{item.name}</h4>
                      <button
                        type="button"
                        onClick={() => removeFromCart(item.variantId)}
                        className="text-[#66636A] hover:text-rose-600 p-1 transition-colors"
                        title="Remove item"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="flex items-center gap-2 mt-0.5">
                      <Badge variant="neutral" size="sm" className="bg-[#FAF9F7] text-[#222222] border-border text-[10px]">
                        Size {item.size}
                      </Badge>
                      <span className="text-xs font-medium text-[#66636A]">${item.price.toFixed(2)}</span>
                    </div>

                    <div className="flex items-center justify-between mt-2.5">
                      <div className="flex items-center border border-border rounded-lg bg-[#FAF9F7]">
                        <button
                          type="button"
                          onClick={() => updateQty(item.variantId, item.qty - 1)}
                          className="p-1 text-[#66636A] hover:text-[#222222] transition-colors"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <span className="px-2 text-xs font-bold text-[#222222]">{item.qty}</span>
                        <button
                          type="button"
                          onClick={() => updateQty(item.variantId, item.qty + 1)}
                          disabled={item.qty >= item.stock_qty}
                          className="p-1 text-[#66636A] hover:text-[#222222] transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <span className="text-sm font-extrabold text-[#714B67]">
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
            <div className="p-5 border-t border-border bg-[#F8F9FA] space-y-4">
              {/* Member Discount Notification */}
              {discountPct > 0 ? (
                <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-between text-xs text-emerald-800">
                  <div className="flex items-center gap-1.5 font-medium">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    <span>Member Discount ({discountPct}%) Applied</span>
                  </div>
                  <span className="font-bold text-emerald-700">-${discountAmount.toFixed(2)}</span>
                </div>
              ) : isAuthenticated ? (
                <div className="p-2.5 rounded-xl bg-canvas border border-border text-[11px] text-[#66636A] flex items-center justify-between">
                  <span>Standard Member Pricing</span>
                  <Link to="/members" className="text-[#714B67] font-semibold hover:underline">
                    Upgrade for 15% off
                  </Link>
                </div>
              ) : null}

              {/* Price Calculation */}
              <div className="space-y-1.5 text-xs text-[#66636A] border-b border-border pb-3">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span className="text-[#222222] font-semibold">${subtotal.toFixed(2)}</span>
                </div>
                {discountAmount > 0 && (
                  <div className="flex justify-between text-emerald-600 font-medium">
                    <span>Member Discount</span>
                    <span>-${discountAmount.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm font-bold text-[#222222] pt-1">
                  <span>Total Payable</span>
                  <span className="text-[#714B67] text-base font-extrabold">${totalPayable.toFixed(2)}</span>
                </div>
              </div>

              {/* Payment Method Selector */}
              <div>
                <label className="text-xs font-semibold text-[#222222] block mb-1.5">Payment Method</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setPaymentProvider('mock')}
                    className={`p-2.5 rounded-xl border text-xs font-medium flex flex-col items-center gap-1 transition-all ${
                      paymentProvider === 'mock'
                        ? 'bg-[#714B67]/10 border-[#714B67] text-[#714B67] font-semibold ring-1 ring-[#714B67]'
                        : 'bg-white border-border text-[#66636A] hover:border-gray-300 hover:text-[#222222]'
                    }`}
                  >
                    <CheckCircle2 className="w-4 h-4 text-[#714B67]" />
                    <span>Instant / Cash</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentProvider('stripe')}
                    className={`p-2.5 rounded-xl border text-xs font-medium flex flex-col items-center gap-1 transition-all ${
                      paymentProvider === 'stripe'
                        ? 'bg-[#714B67]/10 border-[#714B67] text-[#714B67] font-semibold ring-1 ring-[#714B67]'
                        : 'bg-white border-border text-[#66636A] hover:border-gray-300 hover:text-[#222222]'
                    }`}
                  >
                    <CreditCard className="w-4 h-4 text-[#017E84]" />
                    <span>Card (Stripe Test)</span>
                  </button>
                </div>
              </div>

              {/* Checkout Button */}
              <Button
                variant="primary"
                size="lg"
                className="w-full bg-[#714B67] hover:bg-[#5B3B52] text-white shadow-sm font-bold"
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
