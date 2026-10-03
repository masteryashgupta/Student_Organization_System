import React from 'react';
import JoinClubPage from './JoinClubPage';
import MemberListPage from './MemberListPage';
import MemberProfilePage from './MemberProfilePage';
import VerifyMemberPage from './VerifyMemberPage';
import { useAuth } from '../../lib/AuthContext';
import { registerFeature } from '../../app/routeRegistry';

function MembersLanding() {
  const { user, isOfficer, isAuthenticated } = useAuth();
  if (isOfficer) {
    return <MemberListPage />;
  }
  if (isAuthenticated) {
    return <MemberProfilePage />;
  }
  return <JoinClubPage />;
}

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
    element: <MembersLanding />,
  },
  {
    path: '/members/me',
    element: <MemberProfilePage />,
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
      path: '/members',
      label: 'Members',
    },
  ],
});

export default memberRoutes;

