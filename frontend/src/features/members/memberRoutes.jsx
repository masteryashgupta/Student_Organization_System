import React from 'react';
import { Navigate } from 'react-router-dom';
import JoinClubPage from './JoinClubPage';
import MemberListPage from './MemberListPage';
import MemberProfilePage from './MemberProfilePage';
import VerifyMemberPage from './VerifyMemberPage';
import ProtectedRoute from '../../components/auth/ProtectedRoute';
import { useAuth } from '../../lib/AuthContext';
import { registerFeature } from '../../app/routeRegistry';

function MembersLanding() {
  const { isOfficer, isAuthenticated, loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-brand-500/30 border-t-brand-600 rounded-full animate-spin" />
      </div>
    );
  }
  if (!isAuthenticated) {
    return <Navigate to="/login?redirect=/members" replace />;
  }
  if (isOfficer) {
    return <MemberListPage />;
  }
  return <MemberProfilePage />;
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
    element: (
      <ProtectedRoute>
        <MemberProfilePage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/members/profile',
    element: (
      <ProtectedRoute>
        <MemberProfilePage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/profile',
    element: (
      <ProtectedRoute>
        <MemberProfilePage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/members/verify',
    element: (
      <ProtectedRoute volunteerOnly>
        <VerifyMemberPage />
      </ProtectedRoute>
    ),
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

