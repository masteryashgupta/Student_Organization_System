import React from 'react';
import LoginPage from './LoginPage';
import RegisterPage from './RegisterPage';
import { registerFeature } from '../../app/routeRegistry';

const authRoutes = [
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/register',
    element: <RegisterPage />,
  },
];

registerFeature({
  id: 'auth',
  name: 'Authentication',
  routes: authRoutes,
  navItems: [],
});

export default authRoutes;
