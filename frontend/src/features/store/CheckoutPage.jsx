import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ShoppingBag, ArrowLeft, ShieldCheck, CreditCard, CheckCircle2, Lock, Sparkles, AlertCircle } from 'lucide-react';
import { useCart } from './CartContext';
import { useAuth } from '../../lib/AuthContext';
import { useToast } from '../../components/ui/Toast';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Input } from '../../components/ui/Input';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import api from '../../lib/api';

export default function CheckoutPage() {
  const { items, totalItems, subtotal, clearCart } = useCart();
  const { user, isAuthenticated } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Form State with Initial Values from Auth
  const [formData, setFormData] = useState({
    name: user?.name || user?.username || '',
    email: user?.email || '',
    phone: user?.phone || '',
    studentId: '',
    pickupLocation: 'Club Headquarters (Student Center Rm 204)',
    notes: '',
  });

  const [errors, setErrors] = useState({});
  const [paymentProvider, setPaymentProvider] = useState('mock'); // 'mock' or 'stripe'
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
  });

  const discountPct = memberDiscountData?.is_active_member ? Number(memberDiscountData?.merch_discount_pct || 0) : 0;
  const discountAmount = Number(((subtotal * discountPct) / 100).toFixed(2));
  const totalPayable = Math.max(0, subtotal - discountAmount);

  // Validate Buyer Details
  const validateForm = () => {
    const errs = {};
    if (!formData.name.trim()) errs.name = 'Full name is required.';
    if (!formData.email.trim()) {
      errs.email = 'Email address is required.';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      errs.email = 'Please provide a valid email address.';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: '' }));
    }
  };

  const handleSubmitOrder = async (e) => {
    e.preventDefault();
    if (!validateForm()) {
      toast.error('Please fix the highlighted form errors.');
      return;
    }
    if (items.length === 0) {
      toast.error('Your cart is empty.');
      navigate('/store');
      return;
    }

    setIsProcessing(true);
    try {
      // 1. Create Pending Order
      const orderPayload = {
        items: items.map((i) => ({
          variant_id: i.variantId,
          qty: i.qty,
        })),
        buyer_name: formData.name.trim(),
        buyer_email: formData.email.trim(),
        notes: `Pickup: ${formData.pickupLocation} | Phone: ${formData.phone || 'N/A'} | Note: ${formData.notes || 'None'}`,
      };

      const orderRes = await api.post('/orders/', orderPayload);
      const createdOrder = orderRes.data;

      // 2. Pay via chosen abstraction provider
      await api.post(`/orders/${createdOrder.id}/pay/`, {
        provider: paymentProvider,
        payment_reference: paymentProvider === 'mock' ? `OFFLINE_PAID_${Date.now()}` : undefined,
      });

      // 3. Clear cart & invalidate cache
      clearCart();
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });

      toast.success(`Order #${createdOrder.id} successfully completed!`);
      navigate(`/store/orders/${createdOrder.id}/confirmation`);
    } catch (err) {
      const errorMsg =
        err.response?.data?.message?.items ||
        err.response?.data?.message?.stock_qty ||
        err.response?.data?.message?.payment ||
        err.response?.data?.message ||
        'Order processing failed. Please verify stock availability.';
      toast.error(typeof errorMsg === 'string' ? errorMsg : JSON.stringify(errorMsg));
    } finally {
      setIsProcessing(false);
    }
  };

  if (items.length === 0) {
    return (
      <div className="max-w-md mx-auto py-16 text-center glass-panel rounded-3xl border border-white/40 dark:border-slate-800/80 shadow-2xl p-10 space-y-4 animate-fadeIn">
        <div className="w-16 h-16 rounded-3xl bg-purple-500/10 dark:bg-purple-500/20 flex items-center justify-center mx-auto text-[#714B67] dark:text-purple-300 shadow-inner">
          <ShoppingBag className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white">Your Cart is Empty</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">Add products to your cart before proceeding to checkout.</p>
        <Link to="/store">
          <Button variant="primary" className="rounded-full px-8 bg-gradient-to-r from-[#714B67] to-[#8C5D80] hover:from-[#5B3B52] hover:to-[#714B67] text-white shadow-lg shadow-purple-500/20 font-bold">
            Browse Store Catalog
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto pb-20 space-y-8 animate-fadeIn">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-200/60 dark:border-slate-800/60 pb-5">
        <div>
          <Link to="/store" className="text-xs font-bold text-[#714B67] dark:text-purple-400 hover:underline flex items-center gap-1.5 mb-1.5 transition-colors">
            <ArrowLeft className="w-4 h-4" /> Back to Store
          </Link>
          <h1 className="text-2xl sm:text-4xl font-extrabold text-slate-900 dark:text-white">Order Checkout & Payment</h1>
        </div>
        <div className="flex items-center gap-2 text-xs font-bold text-emerald-800 dark:text-emerald-300 bg-emerald-500/10 dark:bg-emerald-500/20 px-3.5 py-1.5 rounded-full border border-emerald-500/30">
          <Lock className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          <span>Secure Club Checkout</span>
        </div>
      </div>

      <form onSubmit={handleSubmitOrder} className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Buyer & Pickup Information */}
        <div className="lg:col-span-7 space-y-6">
          {/* Buyer Details Card */}
          <div className="p-6 sm:p-8 rounded-3xl glass-panel border-white/40 dark:border-slate-800/80 space-y-4 shadow-xl">
            <h2 className="text-lg font-extrabold text-slate-900 dark:text-white flex items-center gap-2 border-b border-slate-200/60 dark:border-slate-800/60 pb-3">
              <span>1. Buyer Information</span>
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Input
                  label="Full Name *"
                  placeholder="Jane Student"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  error={errors.name}
                  required
                />
              </div>

              <div>
                <Input
                  label="Campus Email Address *"
                  type="email"
                  placeholder="student@skyline.edu"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  error={errors.email}
                  required
                />
              </div>

              <div>
                <Input
                  label="Phone Number (Optional)"
                  placeholder="(555) 000-1234"
                  value={formData.phone}
                  onChange={(e) => handleInputChange('phone', e.target.value)}
                />
              </div>

              <div>
                <Input
                  label="Student ID (Optional)"
                  placeholder="e.g. SKY-98765"
                  value={formData.studentId}
                  onChange={(e) => handleInputChange('studentId', e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Pickup & Delivery Location Card */}
          <div className="p-6 sm:p-8 rounded-3xl glass-panel border-white/40 dark:border-slate-800/80 space-y-4 shadow-xl">
            <h2 className="text-lg font-extrabold text-slate-900 dark:text-white flex items-center gap-2 border-b border-slate-200/60 dark:border-slate-800/60 pb-3">
              <span>2. Campus Pickup Details</span>
            </h2>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-900 dark:text-white block mb-2">Pickup Location</label>
                <select
                  value={formData.pickupLocation}
                  onChange={(e) => handleInputChange('pickupLocation', e.target.value)}
                  className="w-full bg-white/80 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80 rounded-2xl px-4 py-3 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#714B67] dark:focus:ring-purple-400 transition-all font-medium"
                >
                  <option value="Club Headquarters (Student Center Rm 204)">Club Headquarters (Student Center Rm 204)</option>
                  <option value="Skyline Club Merch Table (Plaza Booth #3)">Skyline Club Merch Table (Plaza Booth #3)</option>
                  <option value="Hold for Next General Body Meeting">Hold for Next General Body Meeting</option>
                </select>
              </div>

              <Input
                label="Special Instructions / Delivery Notes (Optional)"
                placeholder="e.g. Friend picking up, hold until Friday..."
                value={formData.notes}
                onChange={(e) => handleInputChange('notes', e.target.value)}
              />
            </div>
          </div>

          {/* Payment Provider Selection */}
          <div className="p-6 sm:p-8 rounded-3xl glass-panel border-white/40 dark:border-slate-800/80 space-y-4 shadow-xl">
            <h2 className="text-lg font-extrabold text-slate-900 dark:text-white flex items-center gap-2 border-b border-slate-200/60 dark:border-slate-800/60 pb-3">
              <span>3. Payment Gateway Provider</span>
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => setPaymentProvider('mock')}
                className={`p-5 rounded-3xl border-2 text-left transition-all flex flex-col justify-between ${
                  paymentProvider === 'mock'
                    ? 'bg-purple-500/10 dark:bg-purple-500/20 border-[#714B67] dark:border-purple-400 ring-1 ring-[#714B67] text-slate-900 dark:text-white shadow-lg shadow-purple-500/10'
                    : 'glass-card bg-slate-50/50 dark:bg-slate-800/40 border-slate-200/80 dark:border-slate-700/80 text-slate-500 dark:text-slate-400 hover:border-purple-300'
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="p-2.5 rounded-2xl bg-purple-500/20 text-[#714B67] dark:text-purple-300 shadow-sm">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <Badge variant="success" size="sm" className="rounded-full px-3">
                    Offline / Demo
                  </Badge>
                </div>
                <div>
                  <h4 className="text-sm font-extrabold text-slate-900 dark:text-white">Instant / Cash / Transfer</h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Works 100% offline. Instant order approval & stock reservation.</p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setPaymentProvider('stripe')}
                className={`p-5 rounded-3xl border-2 text-left transition-all flex flex-col justify-between ${
                  paymentProvider === 'stripe'
                    ? 'bg-purple-500/10 dark:bg-purple-500/20 border-[#714B67] dark:border-purple-400 ring-1 ring-[#714B67] text-slate-900 dark:text-white shadow-lg shadow-purple-500/10'
                    : 'glass-card bg-slate-50/50 dark:bg-slate-800/40 border-slate-200/80 dark:border-slate-700/80 text-slate-500 dark:text-slate-400 hover:border-purple-300'
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="p-2.5 rounded-2xl bg-teal-500/20 text-teal-600 dark:text-teal-400 shadow-sm">
                    <CreditCard className="w-5 h-5" />
                  </div>
                  <Badge variant="accent" size="sm" className="rounded-full px-3">
                    Test Gateway
                  </Badge>
                </div>
                <div>
                  <h4 className="text-sm font-extrabold text-slate-900 dark:text-white">Credit / Debit Card</h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Stripe test-mode integration with simulated card processing.</p>
                </div>
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Itemized Order Summary */}
        <div className="lg:col-span-5">
          <div className="p-6 sm:p-8 rounded-3xl glass-panel border-white/40 dark:border-slate-800/80 space-y-6 shadow-2xl sticky top-6 backdrop-blur-2xl">
            <h2 className="text-xl font-extrabold text-slate-900 dark:text-white border-b border-slate-200/60 dark:border-slate-800/60 pb-3 flex items-center justify-between">
              <span>Order Summary</span>
              <span className="text-xs font-normal text-slate-500 dark:text-slate-400">{totalItems} {totalItems === 1 ? 'item' : 'items'}</span>
            </h2>

            {/* Items List */}
            <div className="max-h-60 overflow-y-auto space-y-3 pr-1">
              {items.map((item) => (
                <div key={item.variantId} className="flex items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-800 overflow-hidden flex-shrink-0 border border-slate-200/60 dark:border-slate-700/60 flex items-center justify-center">
                      {item.image ? (
                        <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-[9px] font-bold text-slate-400">
                          {item.type?.toUpperCase()}
                        </div>
                      )}
                    </div>
                    <div className="truncate">
                      <p className="font-bold text-slate-900 dark:text-white truncate">{item.name}</p>
                      <p className="text-slate-500 dark:text-slate-400">Size: <strong className="text-slate-800 dark:text-slate-200">{item.size}</strong> × {item.qty}</p>
                    </div>
                  </div>
                  <span className="font-extrabold text-slate-900 dark:text-white">${(item.price * item.qty).toFixed(2)}</span>
                </div>
              ))}
            </div>

            {/* Member Discount Badge */}
            {discountPct > 0 ? (
              <div className="p-3.5 rounded-2xl glass-card bg-emerald-500/10 border border-emerald-300/40 dark:border-emerald-700/50 flex items-center justify-between text-xs text-emerald-950 dark:text-emerald-200">
                <div className="flex items-center gap-1.5 font-bold">
                  <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span>Member Privilege ({discountPct}% Off)</span>
                </div>
                <span className="font-black text-emerald-600 dark:text-emerald-400">-${discountAmount.toFixed(2)}</span>
              </div>
            ) : null}

            {/* Financial Calculations */}
            <div className="space-y-2 text-xs text-slate-500 dark:text-slate-400 border-t border-slate-200/60 dark:border-slate-800/60 pt-4">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span className="text-slate-900 dark:text-white font-bold">${subtotal.toFixed(2)}</span>
              </div>
              {discountAmount > 0 && (
                <div className="flex justify-between text-emerald-600 dark:text-emerald-400 font-medium">
                  <span>Member Savings</span>
                  <span>-${discountAmount.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between text-base font-extrabold text-slate-900 dark:text-white border-t border-slate-200/60 dark:border-slate-800/60 pt-3">
                <span>Final Total Due</span>
                <span className="text-[#714B67] dark:text-purple-300 text-xl font-black">${totalPayable.toFixed(2)}</span>
              </div>
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              variant="primary"
              size="lg"
              className="w-full rounded-full bg-gradient-to-r from-[#714B67] to-[#8C5D80] hover:from-[#5B3B52] hover:to-[#714B67] text-white shadow-lg shadow-purple-500/20 font-bold active:scale-95 transition-transform"
              isLoading={isProcessing}
            >
              <Lock className="w-4 h-4 mr-2" />
              <span>Confirm & Pay (${totalPayable.toFixed(2)})</span>
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
