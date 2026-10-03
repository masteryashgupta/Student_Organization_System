import React from 'react';
import { registerFeature } from '../../app/routeRegistry';
import TreasurerDashboardPage from './TreasurerDashboardPage';

registerFeature({
  id: 'finance',
  name: 'Finance',
  navItems: [
    { path: '/finance', label: 'Treasurer Dashboard', officerOnly: true },
  ],
  routes: [
    { path: '/finance', element: <TreasurerDashboardPage /> },
  ],
});
