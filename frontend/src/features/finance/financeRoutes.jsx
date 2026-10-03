import React from 'react';
import { registerFeature } from '../../app/routeRegistry';
import TreasurerDashboardPage from './TreasurerDashboardPage';
import ReimbursementsPage from './ReimbursementsPage';

registerFeature({
  id: 'finance',
  name: 'Finance',
  navItems: [
    { path: '/finance', label: 'Treasurer Dashboard', officerOnly: true },
    { path: '/reimbursements', label: 'Reimbursements' },
  ],
  routes: [
    { path: '/finance', element: <TreasurerDashboardPage /> },
    { path: '/reimbursements', element: <ReimbursementsPage /> },
  ],
});
