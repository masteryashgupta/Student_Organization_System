import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../lib/AuthContext';

/**
 * ProtectedRoute: Forcefully redirects unauthenticated users to /login.
 * Preserves the target route in query parameter 'redirect' and state 'from'
 * so the user lands back on their intended page immediately after login.
 */
export default function ProtectedRoute({
  children,
  officerOnly = false,
  volunteerOnly = false,
}) {
  const { user, loading, isAuthenticated, isOfficer } = useAuth();
  const location = useLocation();

  // Show a clean loading spinner while authentication state is resolving
  if (loading) {
    return (
      <div className="min-h-[55vh] flex flex-col items-center justify-center p-8 text-center animate-pulse">
        <div className="w-10 h-10 border-3 border-brand-500/20 border-t-brand-600 rounded-full animate-spin"></div>
        <p className="text-xs font-bold text-slate-500 dark:text-slate-400 mt-3">
          Verifying security credentials...
        </p>
      </div>
    );
  }

  // Forceful redirect to Login if not logged in
  if (!isAuthenticated) {
    const targetUrl = location.pathname + location.search;
    return (
      <Navigate
        to={`/login?redirect=${encodeURIComponent(targetUrl)}`}
        replace
        state={{ from: location }}
      />
    );
  }

  // If officer privileges are required and user is not an officer/admin
  if (officerOnly && !isOfficer) {
    return <Navigate to="/" replace />;
  }

  // If volunteer or officer privilege is required
  if (volunteerOnly) {
    const isVolunteerOrOfficer =
      isOfficer ||
      user?.role === 'volunteer' ||
      user?.role === 'member';
    if (!isVolunteerOrOfficer) {
      return <Navigate to="/" replace />;
    }
  }

  return children;
}
