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
      <div className="max-w-md mx-auto py-16 text-center bg-white rounded-3xl border border-border shadow-odoo-card p-10 space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-[#714B67]/10 flex items-center justify-center mx-auto text-[#714B67]">
          <ShoppingBag className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-bold text-[#222222]">Your Cart is Empty</h2>
        <p className="text-sm text-[#66636A]">Add products to your cart before proceeding to checkout.</p>
        <Link to="/store">
          <Button variant="primary" className="bg-[#714B67] hover:bg-[#5B3B52] text-white">
            Browse Store Catalog
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto pb-20 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border pb-5">
        <div>
          <Link to="/store" className="text-xs font-semibold text-[#714B67] hover:text-[#5B3B52] flex items-center gap-1.5 mb-1.5 transition-colors">
            <ArrowLeft className="w-4 h-4" /> Back to Store
          </Link>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#222222]">Order Checkout & Payment</h1>
        </div>
        <div className="flex items-center gap-2 text-xs font-semibold text-emerald-800 bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-200">
          <Lock className="w-4 h-4 text-emerald-600" />
          <span>Secure Club Checkout</span>
        </div>
      </div>

      <form onSubmit={handleSubmitOrder} className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Buyer & Pickup Information */}
        <div className="lg:col-span-7 space-y-6">
          {/* Buyer Details Card */}
          <div className="p-6 rounded-3xl bg-white border border-border space-y-4 shadow-odoo-card">
            <h2 className="text-base font-bold text-[#222222] flex items-center gap-2 border-b border-border pb-3">
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
          <div className="p-6 rounded-3xl bg-white border border-border space-y-4 shadow-odoo-card">
            <h2 className="text-base font-bold text-[#222222] flex items-center gap-2 border-b border-border pb-3">
              <span>2. Campus Pickup Details</span>
            </h2>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-[#222222] block mb-1.5">Pickup Location</label>
                <select
                  value={formData.pickupLocation}
                  onChange={(e) => handleInputChange('pickupLocation', e.target.value)}
                  className="w-full bg-[#FAF9F7] border border-border rounded-xl px-3.5 py-2.5 text-sm text-[#222222] focus:outline-none focus:ring-2 focus:ring-[#714B67] transition-all"
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
          <div className="p-6 rounded-3xl bg-white border border-border space-y-4 shadow-odoo-card">
            <h2 className="text-base font-bold text-[#222222] flex items-center gap-2 border-b border-border pb-3">
              <span>3. Payment Gateway Provider</span>
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <button
                type="button"
                onClick={() => setPaymentProvider('mock')}
                className={`p-4 rounded-2xl border text-left transition-all flex flex-col justify-between ${
                  paymentProvider === 'mock'
                    ? 'bg-[#714B67]/10 border-[#714B67] ring-1 ring-[#714B67] text-[#222222] shadow-sm'
                    : 'bg-[#FAF9F7] border-border text-[#66636A] hover:border-gray-300 hover:text-[#222222]'
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="p-2 rounded-xl bg-[#714B67]/10 text-[#714B67]">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <Badge variant="success" size="sm" className="bg-emerald-50 text-emerald-800 border-emerald-200">
                    Offline / Demo
                  </Badge>
                </div>
                <div>
                  <h4 className="text-sm font-bold text-[#222222]">Instant / Cash / Transfer</h4>
                  <p className="text-xs text-[#66636A] mt-1">Works 100% offline. Instant order approval & stock reservation.</p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setPaymentProvider('stripe')}
                className={`p-4 rounded-2xl border text-left transition-all flex flex-col justify-between ${
                  paymentProvider === 'stripe'
                    ? 'bg-[#714B67]/10 border-[#714B67] ring-1 ring-[#714B67] text-[#222222] shadow-sm'
                    : 'bg-[#FAF9F7] border-border text-[#66636A] hover:border-gray-300 hover:text-[#222222]'
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="p-2 rounded-xl bg-[#017E84]/15 text-[#017E84]">
                    <CreditCard className="w-5 h-5" />
                  </div>
                  <Badge variant="accent" size="sm" className="bg-[#017E84]/10 text-[#017E84] border-[#017E84]/20">
                    Test Gateway
                  </Badge>
                </div>
                <div>
                  <h4 className="text-sm font-bold text-[#222222]">Credit / Debit Card</h4>
                  <p className="text-xs text-[#66636A] mt-1">Stripe test-mode integration with simulated card processing.</p>
                </div>
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Itemized Order Summary */}
        <div className="lg:col-span-5">
          <div className="p-6 rounded-3xl bg-white border border-border space-y-6 shadow-odoo-card sticky top-6">
            <h2 className="text-lg font-bold text-[#222222] border-b border-border pb-3 flex items-center justify-between">
              <span>Order Summary</span>
              <span className="text-xs font-normal text-[#66636A]">{totalItems} {totalItems === 1 ? 'item' : 'items'}</span>
            </h2>

            {/* Items List */}
            <div className="max-h-60 overflow-y-auto space-y-3 pr-1">
              {items.map((item) => (
                <div key={item.variantId} className="flex items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-10 h-10 rounded-lg bg-canvas overflow-hidden flex-shrink-0 border border-border flex items-center justify-center">
                      {item.image ? (
                        <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-[9px] font-bold text-[#66636A]">
                          {item.type?.toUpperCase()}
                        </div>
                      )}
                    </div>
                    <div className="truncate">
                      <p className="font-semibold text-[#222222] truncate">{item.name}</p>
                      <p className="text-[#66636A]">Size: <strong className="text-[#222222]">{item.size}</strong> × {item.qty}</p>
                    </div>
                  </div>
                  <span className="font-bold text-[#222222]">${(item.price * item.qty).toFixed(2)}</span>
                </div>
              ))}
            </div>

            {/* Member Discount Badge */}
            {discountPct > 0 ? (
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-between text-xs text-emerald-800">
                <div className="flex items-center gap-1.5 font-medium">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>Member Privilege ({discountPct}% Off)</span>
                </div>
                <span className="font-bold text-emerald-700">-${discountAmount.toFixed(2)}</span>
              </div>
            ) : null}

            {/* Financial Calculations */}
            <div className="space-y-2 text-xs text-[#66636A] border-t border-border pt-4">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span className="text-[#222222] font-semibold">${subtotal.toFixed(2)}</span>
              </div>
              {discountAmount > 0 && (
                <div className="flex justify-between text-emerald-600 font-medium">
                  <span>Member Savings</span>
                  <span>-${discountAmount.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between text-base font-extrabold text-[#222222] border-t border-border pt-3">
                <span>Final Total Due</span>
                <span className="text-[#714B67] text-lg font-black">${totalPayable.toFixed(2)}</span>
              </div>
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              variant="primary"
              size="lg"
              className="w-full bg-[#714B67] hover:bg-[#5B3B52] text-white shadow-sm font-bold"
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
