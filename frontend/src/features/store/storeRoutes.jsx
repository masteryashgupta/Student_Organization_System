import React from 'react';
import { registerFeature } from '../../app/routeRegistry';
import { CartProvider } from './CartContext';
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
    element: <StoreWrapper Component={CheckoutPage} />,
  },
  {
    path: '/store/orders/:id/confirmation',
    element: <StoreWrapper Component={OrderConfirmationPage} />,
  },
  {
    path: '/store/orders',
    element: <StoreWrapper Component={MyOrdersPage} />,
  },
  {
    path: '/store/manage/orders',
    element: <StoreWrapper Component={OfficerOrdersPage} />,
  },
  {
    path: '/store/manage/inventory',
    element: <StoreWrapper Component={OfficerInventoryPage} />,
  },
];

registerFeature({
  id: 'store',
  name: 'Merch Store',
  routes: storeRoutes,
  navItems: [
    {
      path: '/store',
      label: 'Merch Store',
    },
    {
      path: '/store/orders',
      label: 'My Orders',
      memberOnly: true,
    },
    {
      path: '/store/manage/orders',
      label: 'Store Orders Desk',
      officerOnly: true,
    },
    {
      path: '/store/manage/inventory',
      label: 'Low Stock & Inventory',
      officerOnly: true,
    },
  ],
});

export default storeRoutes;
