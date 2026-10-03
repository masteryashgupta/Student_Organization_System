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

function ProductDetailImage({ src, name, type }) {
  const [imgError, setImgError] = useState(false);

  if (!src || imgError) {
    return (
      <div className="w-full h-full bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-900 flex flex-col items-center justify-center text-slate-500 dark:text-slate-400 p-8 text-center select-none">
        <div className="w-20 h-20 rounded-3xl bg-white/80 dark:bg-slate-800/80 shadow-md flex items-center justify-center mb-4">
          <ShoppingBag className="w-10 h-10 text-[#714B67] dark:text-purple-400" />
        </div>
        <span className="text-base font-extrabold uppercase tracking-wider text-slate-800 dark:text-slate-200 line-clamp-2">{name}</span>
        <span className="text-xs font-semibold text-slate-400 uppercase mt-1">{type}</span>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={name}
      onError={() => setImgError(true)}
      className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500"
    />
  );
}

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
        <div className="h-6 bg-slate-200 dark:bg-slate-700 rounded-full w-32" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
          <div className="h-96 glass-card bg-slate-100/50 dark:bg-slate-800/40 rounded-3xl" />
          <div className="space-y-4">
            <div className="h-8 bg-slate-200 dark:bg-slate-700 rounded-xl w-3/4" />
            <div className="h-6 bg-slate-200 dark:bg-slate-700 rounded-xl w-1/4" />
            <div className="h-32 bg-slate-200 dark:bg-slate-700 rounded-2xl" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="max-w-lg mx-auto text-center py-20 glass-panel rounded-3xl border border-white/40 dark:border-slate-800/80 p-8 space-y-4 shadow-xl">
        <AlertCircle className="w-12 h-12 text-rose-500 mx-auto" />
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">Product Not Found</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">The requested merchandise item does not exist or has been retired.</p>
        <Link to="/store">
          <Button variant="primary" className="rounded-full bg-gradient-to-r from-[#714B67] to-[#8C5D80] text-white">Return to Store</Button>
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
    <div className="max-w-6xl mx-auto pb-20 space-y-8 animate-fadeIn">
      {/* Breadcrumb Navigation */}
      <div className="flex items-center justify-between">
        <Link
          to="/store"
          className="inline-flex items-center text-sm font-semibold text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4 mr-1.5" /> Back to Merch Catalog
        </Link>

        <Button variant="ghost" size="sm" onClick={openDrawer} className="rounded-full text-slate-600 dark:text-slate-300">
          <ShoppingBag className="w-4 h-4 mr-2 text-[#714B67] dark:text-purple-400" /> View Cart
        </Button>
      </div>

      {/* Main Product Display Card */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 glass-panel border-white/40 dark:border-slate-800/80 rounded-3xl p-6 sm:p-10 shadow-2xl">
        {/* Left: Product Media Gallery */}
        <div className="lg:col-span-6 flex flex-col items-center justify-center">
          <div className="relative w-full aspect-square rounded-3xl bg-slate-100/70 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-800/60 overflow-hidden flex items-center justify-center group shadow-inner">
            <ProductDetailImage src={product.image} name={product.name} type={product.type} />

            <div className="absolute top-4 left-4 z-10">
              <Badge variant="accent" size="md" className="rounded-full px-3.5 shadow-md">
                {product.type_display || product.type?.toUpperCase()}
              </Badge>
            </div>
          </div>
        </div>

        {/* Right: Product Details & Size Selector */}
        <div className="lg:col-span-6 flex flex-col justify-between space-y-6">
          <div className="space-y-4">
            <div>
              <span className="text-xs font-bold text-[#714B67] dark:text-purple-300 uppercase tracking-widest">
                Official Club Merchandise
              </span>
              <h1 className="text-2xl sm:text-4xl font-extrabold text-slate-900 dark:text-white mt-1 leading-tight">
                {product.name}
              </h1>
            </div>

            {/* Price Display & Discount Banner */}
            <div className="flex items-baseline gap-3">
              <span className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white">${unitPrice.toFixed(2)}</span>
              {discountPct > 0 && (
                <span className="text-base sm:text-lg font-bold text-emerald-600 dark:text-emerald-400">
                  ${discountedPrice.toFixed(2)} with Member Discount ({discountPct}% off)
                </span>
              )}
            </div>

            {/* Member Discount Promo Card */}
            {discountPct > 0 ? (
              <div className="p-4 rounded-2xl glass-card bg-emerald-500/10 border border-emerald-300/40 dark:border-emerald-700/50 flex items-center gap-3 text-xs text-emerald-950 dark:text-emerald-200">
                <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
                <span>
                  <strong>Active Member Privilege:</strong> Your {discountPct}% merchandise discount is automatically calculated at checkout.
                </span>
              </div>
            ) : isAuthenticated ? (
              <div className="p-4 rounded-2xl glass-card bg-slate-100/70 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 flex items-center justify-between text-xs text-slate-600 dark:text-slate-300">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-500" />
                  <span>Join Gold Membership for an extra 15% off all store merchandise.</span>
                </div>
                <Link to="/join" className="text-[#714B67] dark:text-purple-400 font-bold hover:underline ml-2 shrink-0">
                  Upgrade
                </Link>
              </div>
            ) : null}

            {/* Description */}
            <div className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed border-t border-slate-200/60 dark:border-slate-800/60 pt-4">
              <p>{product.description || 'Premium official Skyline Club student merchandise crafted with ultra-comfortable materials and club crest embroidery.'}</p>
            </div>
          </div>

          {/* ── SIZE SELECTOR WITH LIVE PER-SIZE STOCK ── */}
          <div className="space-y-4 border-t border-slate-200/60 dark:border-slate-800/60 pt-5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                Select Size:
              </label>
              {selectedVariant && (
                <span className={`text-xs font-bold ${
                  selectedVariant.stock_qty <= 0
                    ? 'text-rose-600 dark:text-rose-400'
                    : selectedVariant.stock_qty <= 5
                    ? 'text-amber-600 dark:text-amber-400'
                    : 'text-emerald-600 dark:text-emerald-400'
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
                    className={`relative p-3.5 rounded-2xl border-2 text-center transition-all duration-200 flex flex-col items-center justify-center ${
                      isSelected
                        ? 'bg-purple-500/10 dark:bg-purple-500/20 border-[#714B67] dark:border-purple-400 text-[#714B67] dark:text-purple-300 shadow-md shadow-purple-500/10'
                        : inStock
                        ? 'glass-card bg-white/70 dark:bg-slate-900/60 border-slate-200/80 dark:border-slate-800/80 text-slate-900 dark:text-white hover:border-purple-300 dark:hover:border-purple-700'
                        : 'bg-slate-100/50 dark:bg-slate-800/30 border-slate-200/50 dark:border-slate-800/50 text-slate-400 cursor-not-allowed opacity-50'
                    }`}
                  >
                    <span className={`text-sm font-extrabold ${!inStock ? 'line-through' : ''}`}>
                      {variant.size}
                    </span>
                    <span className="text-[10px] mt-0.5 font-medium text-slate-500 dark:text-slate-400">
                      {inStock ? `${variant.stock_qty} left` : 'Sold Out'}
                    </span>

                    {isSelected && (
                      <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-[#714B67] dark:bg-purple-400 shadow-sm" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Quantity Selector & Add to Cart Button */}
          <div className="space-y-4 pt-2">
            <div className="flex items-center gap-4">
              <div className="flex items-center border border-slate-200/80 dark:border-slate-700/80 rounded-2xl glass-card bg-slate-100/70 dark:bg-slate-800/60 px-3 py-1.5 shadow-inner">
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400 mr-3 pl-1">Qty:</span>
                <button
                  type="button"
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  disabled={quantity <= 1 || !isSelectedInStock}
                  className="p-1.5 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white disabled:opacity-30 transition-colors"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <span className="px-3 text-sm font-black text-slate-900 dark:text-white">{quantity}</span>
                <button
                  type="button"
                  onClick={() => setQuantity((q) => Math.min(maxAvailableQty, q + 1))}
                  disabled={quantity >= maxAvailableQty || !isSelectedInStock}
                  className="p-1.5 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white disabled:opacity-30 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>

              {/* Add to Cart CTA */}
              <Button
                variant="primary"
                size="lg"
                className="flex-1 rounded-full shadow-lg shadow-purple-500/20 bg-gradient-to-r from-[#714B67] to-[#8C5D80] hover:from-[#5B3B52] hover:to-[#714B67] text-white font-bold transition-transform active:scale-95"
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
