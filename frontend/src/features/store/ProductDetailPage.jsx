import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ShoppingBag, ArrowLeft, Check, AlertCircle, ShieldCheck, Sparkles, Plus, Minus } from 'lucide-react';
import { useCart } from './CartContext';
import { useAuth } from '../../lib/AuthContext';
import { useToast } from '../../components/ui/Toast';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import CartDrawer from './CartDrawer';
import api from '../../lib/api';

export default function ProductDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { addToCart, openDrawer } = useCart();
  const { user, isAuthenticated } = useAuth();

  const [selectedVariant, setSelectedVariant] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [isAdding, setIsAdding] = useState(false);

  // Fetch Product Details with Live Variants
  const { data: product, isLoading, error } = useQuery({
    queryKey: ['product', id],
    queryFn: async () => {
      const res = await api.get(`/products/${id}/`);
      return res.data;
    },
    staleTime: 1000 * 10,
  });

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

  // Auto-select first in-stock variant when loaded
  useEffect(() => {
    if (product?.variants?.length > 0 && !selectedVariant) {
      const firstInStock = product.variants.find((v) => v.stock_qty > 0) || product.variants[0];
      setSelectedVariant(firstInStock);
    }
  }, [product, selectedVariant]);

  // Handle Size Selection
  const handleSelectSize = (variant) => {
    if (variant.stock_qty <= 0) return;
    setSelectedVariant(variant);
    setQuantity(1); // Reset qty to 1 on size change
  };

  const handleAddToCart = () => {
    if (!selectedVariant) {
      toast.error('Please choose a size first.');
      return;
    }
    if (selectedVariant.stock_qty <= 0) {
      toast.error('Selected size is out of stock.');
      return;
    }

    setIsAdding(true);
    setTimeout(() => {
      addToCart(product, selectedVariant, quantity);
      toast.success(`Added ${quantity}x ${product.name} (${selectedVariant.size}) to cart!`);
      setIsAdding(false);
    }, 200);
  };

  if (isLoading) {
    return (
      <div className="max-w-5xl mx-auto py-12 animate-pulse space-y-6">
        <div className="h-6 bg-gray-100 rounded w-32" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
          <div className="h-96 bg-gray-100 rounded-3xl" />
          <div className="space-y-4">
            <div className="h-8 bg-gray-100 rounded w-3/4" />
            <div className="h-6 bg-gray-100 rounded w-1/4" />
            <div className="h-32 bg-gray-100 rounded" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="max-w-lg mx-auto text-center py-20 bg-white rounded-3xl border border-border p-8 space-y-4 shadow-sm">
        <AlertCircle className="w-12 h-12 text-danger-500 mx-auto" />
        <h2 className="text-xl font-bold text-[#222222]">Product Not Found</h2>
        <p className="text-sm text-[#66636A]">The requested merchandise item does not exist or has been retired.</p>
        <Link to="/store">
          <Button variant="primary" className="bg-[#714B67] hover:bg-[#5B3B52] text-white">Return to Store</Button>
        </Link>
      </div>
    );
  }

  const variants = product.variants || [];
  const hasAnyStock = product.is_in_stock && product.total_stock > 0;
  const isSelectedInStock = selectedVariant && selectedVariant.stock_qty > 0;
  const maxAvailableQty = selectedVariant?.stock_qty || 1;

  const unitPrice = Number(product.price);
  const discountedPrice = discountPct > 0 ? unitPrice * (1 - discountPct / 100) : unitPrice;

  return (
    <div className="max-w-6xl mx-auto pb-20 space-y-8">
      {/* Breadcrumb Navigation */}
      <div className="flex items-center justify-between">
        <Link
          to="/store"
          className="inline-flex items-center text-sm font-medium text-[#66636A] hover:text-[#222222] transition-colors"
        >
          <ArrowLeft className="w-4 h-4 mr-1.5" /> Back to Merch Catalog
        </Link>

        <Button variant="ghost" size="sm" onClick={openDrawer} className="text-[#66636A] hover:text-[#222222]">
          <ShoppingBag className="w-4 h-4 mr-2" /> View Cart
        </Button>
      </div>

      {/* Main Product Display Card */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 bg-white border border-border rounded-3xl p-6 sm:p-10 shadow-odoo-card">
        {/* Left: Product Media Gallery */}
        <div className="lg:col-span-6 flex flex-col items-center justify-center">
          <div className="relative w-full aspect-square rounded-2xl bg-[#F4F6F8] border border-border overflow-hidden flex items-center justify-center group">
            {product.image ? (
              <img
                src={product.image}
                alt={product.name}
                className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500"
              />
            ) : (
              <div className="flex flex-col items-center justify-center text-[#66636A]">
                <ShoppingBag className="w-20 h-20 mb-2 opacity-30" />
                <span className="text-sm font-bold uppercase tracking-widest text-[#66636A]">{product.type}</span>
              </div>
            )}

            <div className="absolute top-4 left-4">
              <Badge variant="accent" size="md">
                {product.type_display || product.type?.toUpperCase()}
              </Badge>
            </div>
          </div>
        </div>

        {/* Right: Product Details & Size Selector */}
        <div className="lg:col-span-6 flex flex-col justify-between space-y-6">
          <div className="space-y-4">
            <div>
              <span className="text-xs font-bold text-[#714B67] uppercase tracking-widest">
                Official Club Merchandise
              </span>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-[#222222] mt-1 leading-tight">
                {product.name}
              </h1>
            </div>

            {/* Price Display & Discount Banner */}
            <div className="flex items-baseline gap-3">
              <span className="text-3xl font-black text-[#222222]">${unitPrice.toFixed(2)}</span>
              {discountPct > 0 && (
                <span className="text-lg font-bold text-emerald-700">
                  ${discountedPrice.toFixed(2)} with Member Discount ({discountPct}% off)
                </span>
              )}
            </div>

            {/* Member Discount Promo Card */}
            {discountPct > 0 ? (
              <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center gap-2.5 text-xs text-emerald-800">
                <ShieldCheck className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                <span>
                  <strong>Active Member Privilege:</strong> Your {discountPct}% merchandise discount is automatically calculated at checkout.
                </span>
              </div>
            ) : isAuthenticated ? (
              <div className="p-3.5 rounded-xl bg-[#F4F6F8] border border-border flex items-center justify-between text-xs text-[#66636A]">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-500" />
                  <span>Join Gold Membership for an extra 15% off all store merchandise.</span>
                </div>
                <Link to="/join" className="text-[#714B67] font-bold hover:underline">
                  Upgrade
                </Link>
              </div>
            ) : null}

            {/* Description */}
            <div className="text-sm text-[#66636A] leading-relaxed border-t border-border pt-4">
              <p>{product.description || 'Premium official Skyline Club student merchandise crafted with ultra-comfortable materials and club crest embroidery.'}</p>
            </div>
          </div>

          {/* ── SIZE SELECTOR WITH LIVE PER-SIZE STOCK ── */}
          <div className="space-y-4 border-t border-border pt-5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-[#222222]">
                Select Size:
              </label>
              {selectedVariant && (
                <span className={`text-xs font-semibold ${
                  selectedVariant.stock_qty <= 0
                    ? 'text-rose-700'
                    : selectedVariant.stock_qty <= 5
                    ? 'text-amber-700'
                    : 'text-emerald-700'
                }`}>
                  {selectedVariant.stock_qty <= 0
                    ? 'Out of Stock'
                    : selectedVariant.stock_qty <= 5
                    ? `Only ${selectedVariant.stock_qty} left in stock!`
                    : `${selectedVariant.stock_qty} units available`}
                </span>
              )}
            </div>

            {/* Size Chips */}
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5">
              {variants.map((variant) => {
                const isSelected = selectedVariant?.id === variant.id;
                const inStock = variant.stock_qty > 0;

                return (
                  <button
                    key={variant.id || variant.size}
                    type="button"
                    disabled={!inStock}
                    onClick={() => handleSelectSize(variant)}
                    className={`relative p-3 rounded-xl border text-center transition-all duration-150 flex flex-col items-center justify-center ${
                      isSelected
                        ? 'bg-[#714B67]/10 border-[#714B67] text-[#714B67] shadow-sm ring-1 ring-[#714B67]'
                        : inStock
                        ? 'bg-white border-border text-[#222222] hover:border-gray-400'
                        : 'bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed opacity-50'
                    }`}
                  >
                    <span className={`text-sm font-bold ${!inStock ? 'line-through' : ''}`}>
                      {variant.size}
                    </span>
                    <span className="text-[10px] mt-0.5 font-medium text-[#66636A]">
                      {inStock ? `${variant.stock_qty} left` : 'Sold Out'}
                    </span>

                    {isSelected && (
                      <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#714B67]" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Quantity Selector & Add to Cart Button */}
          <div className="space-y-4 pt-2">
            <div className="flex items-center gap-4">
              <div className="flex items-center border border-border rounded-xl bg-[#F4F6F8] px-2 py-1">
                <span className="text-xs font-semibold text-[#66636A] mr-3 pl-1">Qty:</span>
                <button
                  type="button"
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  disabled={quantity <= 1 || !isSelectedInStock}
                  className="p-1.5 text-[#66636A] hover:text-[#222222] disabled:opacity-30 transition-colors"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <span className="px-3 text-sm font-bold text-[#222222]">{quantity}</span>
                <button
                  type="button"
                  onClick={() => setQuantity((q) => Math.min(maxAvailableQty, q + 1))}
                  disabled={quantity >= maxAvailableQty || !isSelectedInStock}
                  className="p-1.5 text-[#66636A] hover:text-[#222222] disabled:opacity-30 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>

              {/* Add to Cart CTA */}
              <Button
                variant="primary"
                size="lg"
                className="flex-1 shadow-sm bg-[#714B67] hover:bg-[#5B3B52] text-white font-semibold"
                disabled={!hasAnyStock || !isSelectedInStock}
                isLoading={isAdding}
                onClick={handleAddToCart}
              >
                <ShoppingBag className="w-5 h-5 mr-2" />
                <span>
                  {!hasAnyStock
                    ? 'Sold Out'
                    : !selectedVariant
                    ? 'Choose Size'
                    : !isSelectedInStock
                    ? 'Size Out of Stock'
                    : `Add to Cart - $${(unitPrice * quantity).toFixed(2)}`}
                </span>
              </Button>
            </div>
          </div>
        </div>
      </div>

      <CartDrawer />
    </div>
  );
}
