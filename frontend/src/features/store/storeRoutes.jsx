import React from 'react';
import { registerFeature } from '../../app/routeRegistry';
import { CartProvider } from './CartContext';
import ProtectedRoute from '../../components/auth/ProtectedRoute';
import ProductCatalogPage from './ProductCatalogPage';
import ProductDetailPage from './ProductDetailPage';
import CartPage from './CartPage';
import CheckoutPage from './CheckoutPage';
import OrderConfirmationPage from './OrderConfirmationPage';
import MyOrdersPage from './MyOrdersPage';
import OfficerOrdersPage from './OfficerOrdersPage';
import OfficerInventoryPage from './OfficerInventoryPage';

// Wrap Store routes with CartProvider for global cart state
function StoreWrapper({ Component }) {
  return (
    <CartProvider>
      <Component />
    </CartProvider>
  );
}

const storeRoutes = [
  {
    path: '/store',
    element: <StoreWrapper Component={ProductCatalogPage} />,
  },
  {
    path: '/store/:id',
    element: <StoreWrapper Component={ProductDetailPage} />,
  },
  {
    path: '/store/cart',
    element: <StoreWrapper Component={CartPage} />,
  },
  {
    path: '/store/checkout',
    element: (
      <ProtectedRoute>
        <StoreWrapper Component={CheckoutPage} />
      </ProtectedRoute>
    ),
  },
  {
    path: '/store/orders/:id/confirmation',
    element: (
      <ProtectedRoute>
        <StoreWrapper Component={OrderConfirmationPage} />
      </ProtectedRoute>
    ),
  },
  {
    path: '/store/orders',
    element: (
      <ProtectedRoute>
        <StoreWrapper Component={MyOrdersPage} />
      </ProtectedRoute>
    ),
  },
  {
    path: '/store/manage/orders',
    element: (
      <ProtectedRoute officerOnly>
        <StoreWrapper Component={OfficerOrdersPage} />
      </ProtectedRoute>
    ),
  },
  {
    path: '/store/manage/inventory',
    element: (
      <ProtectedRoute officerOnly>
        <StoreWrapper Component={OfficerInventoryPage} />
      </ProtectedRoute>
    ),
  },
];

registerFeature({
  id: 'store',
  name: 'Merch Store',
  routes: storeRoutes,
  navItems: [
    {
      path: '/store',
      label: 'Store',
    },
  ],
});

export default storeRoutes;
