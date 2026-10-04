import React from 'react';
import { registerFeature } from '../../app/routeRegistry';
import ProtectedRoute from '../../components/auth/ProtectedRoute';
import TreasurerDashboardPage from './TreasurerDashboardPage';
import ReimbursementsPage from './ReimbursementsPage';

registerFeature({
  id: 'finance',
  name: 'Finance',
  navItems: [
    { path: '/finance', label: 'Finances', officerOnly: true },
  ],
  routes: [
    {
      path: '/finance',
      element: (
        <ProtectedRoute officerOnly>
          <TreasurerDashboardPage />
        </ProtectedRoute>
      ),
    },
    {
      path: '/reimbursements',
      element: (
        <ProtectedRoute>
          <ReimbursementsPage />
        </ProtectedRoute>
      ),
    },
  ],
});
