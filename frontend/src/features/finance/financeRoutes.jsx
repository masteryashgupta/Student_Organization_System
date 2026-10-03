import React from 'react';
import { registerFeature } from '../../app/routeRegistry';
import TreasurerDashboardPage from './TreasurerDashboardPage';
import ReimbursementsPage from './ReimbursementsPage';

registerFeature({
  id: 'finance',
  name: 'Finance',
  navItems: [
    { path: '/finance', label: 'Finances', officerOnly: true },
  ],
  routes: [
    { path: '/finance', element: <TreasurerDashboardPage /> },
    { path: '/reimbursements', element: <ReimbursementsPage /> },
  ],
});
