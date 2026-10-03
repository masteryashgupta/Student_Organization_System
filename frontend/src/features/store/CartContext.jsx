import React, { createContext, useContext, useState, useEffect } from 'react';

const CartContext = createContext(null);

export function CartProvider({ children }) {
  const [items, setItems] = useState(() => {
    try {
      const saved = localStorage.getItem('skyline_store_cart');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem('skyline_store_cart', JSON.stringify(items));
    } catch (e) {
      console.error('Failed to persist cart:', e);
    }
  }, [items]);

  const addToCart = (product, variant, qty = 1) => {
    if (!variant || variant.stock_qty <= 0) {
      return { success: false, message: 'This size is out of stock.' };
    }

    setItems((prev) => {
      const existingIdx = prev.findIndex((i) => i.variantId === variant.id);
      if (existingIdx > -1) {
        const currentQty = prev[existingIdx].qty;
        const newQty = Math.min(currentQty + qty, variant.stock_qty);
        const updated = [...prev];
        updated[existingIdx] = {
          ...updated[existingIdx],
          qty: newQty,
          variant, // sync latest variant data
        };
        return updated;
      }

      return [
        ...prev,
        {
          variantId: variant.id,
          productId: product.id,
          name: product.name,
          type: product.type,
          image: product.image,
          price: Number(product.price),
          size: variant.size,
          sku: variant.sku,
          stock_qty: variant.stock_qty,
          qty: Math.min(qty, variant.stock_qty),
          variant,
        },
      ];
    });

    setIsDrawerOpen(true);
    return { success: true };
  };

  const updateQty = (variantId, newQty) => {
    setItems((prev) => {
      if (newQty <= 0) {
        return prev.filter((i) => i.variantId !== variantId);
      }
      return prev.map((item) => {
        if (item.variantId === variantId) {
          const clampedQty = Math.min(newQty, item.stock_qty || item.variant?.stock_qty || 999);
          return { ...item, qty: clampedQty };
        }
        return item;
      });
    });
  };

  const removeFromCart = (variantId) => {
    setItems((prev) => prev.filter((i) => i.variantId !== variantId));
  };

  const clearCart = () => {
    setItems([]);
  };

  const totalItems = items.reduce((sum, item) => sum + item.qty, 0);
  const subtotal = items.reduce((sum, item) => sum + item.price * item.qty, 0);

  return (
    <CartContext.Provider
      value={{
        items,
        totalItems,
        subtotal,
        addToCart,
        updateQty,
        removeFromCart,
        clearCart,
        isDrawerOpen,
        openDrawer: () => setIsDrawerOpen(true),
        closeDrawer: () => setIsDrawerOpen(false),
        toggleDrawer: () => setIsDrawerOpen((v) => !v),
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}
