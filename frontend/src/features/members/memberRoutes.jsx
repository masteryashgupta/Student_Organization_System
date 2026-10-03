import React from 'react';
import VerifyMemberPage from './VerifyMemberPage';
import { registerFeature } from '../../app/routeRegistry';

const memberRoutes = [
  {
    path: '/members/verify',
    element: <VerifyMemberPage />,
  },
];

registerFeature({
  id: 'members',
  name: 'Membership',
  routes: memberRoutes,
  navItems: [
    {
      path: '/members/verify',
      label: 'Verify Member (Door)',
      officerOnly: true,
    },
  ],
});

export default memberRoutes;
