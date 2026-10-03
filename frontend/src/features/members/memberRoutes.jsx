import React from 'react';
import JoinClubPage from './JoinClubPage';
import MemberListPage from './MemberListPage';
import MemberProfilePage from './MemberProfilePage';
import VerifyMemberPage from './VerifyMemberPage';
import { registerFeature } from '../../app/routeRegistry';

const memberRoutes = [
  {
    path: '/join',
    element: <JoinClubPage />,
  },
  {
    path: '/members/join',
    element: <JoinClubPage />,
  },
  {
    path: '/members',
    element: <MemberListPage />,
  },
  {
    path: '/members/profile',
    element: <MemberProfilePage />,
  },
  {
    path: '/profile',
    element: <MemberProfilePage />,
  },
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
      path: '/join',
      label: 'Join Club',
      roles: ['public'],
    },
    {
      path: '/members/profile',
      label: 'My Membership',
      memberOnly: true,
    },
    {
      path: '/members',
      label: 'Member Roster',
      officerOnly: true,
    },
    {
      path: '/members/verify',
      label: 'Door Verification',
      officerOnly: true,
    },
  ],
});

export default memberRoutes;

