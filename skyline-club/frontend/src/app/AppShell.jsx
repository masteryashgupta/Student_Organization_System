import React, { useState } from 'react';
import { Link, useLocation, useNavigate, Outlet } from 'react-router-dom';
import { useAuth } from '../lib/AuthContext';
import { getRegisteredNavItems } from './routeRegistry';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';

export default function AppShell() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { user, logout, isAuthenticated, isOfficer } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const navItems = getRegisteredNavItems(user?.role || 'public');

  const defaultNavItems = [
    { path: '/', label: 'Overview' },
  ];

  const combinedNav = [...defaultNavItems, ...navItems];

  const getBadgeVariant = (role) => {
    switch (role) {
      case 'admin':
        return 'danger';
      case 'leader':
        return 'warning';
      case 'member':
        return 'success';
      case 'volunteer':
        return 'accent';
      default:
        return 'neutral';
    }
  };

  return (
    <div className="min-h-screen bg-surface-950 flex flex-col lg:flex-row">
      {/* Mobile Header */}
      <header className="lg:hidden bg-surface-900/90 backdrop-blur-md border-b border-slate-800 px-4 py-3 flex items-center justify-between sticky top-0 z-40">
        <Link to="/" className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-brand-600 to-accent-500 flex items-center justify-center font-bold text-white shadow-md">
            S
          </div>
          <span className="font-bold text-base tracking-tight text-white">Skyline Club</span>
        </Link>
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="p-2 text-slate-300 hover:text-white rounded-lg focus:outline-none"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            {mobileMenuOpen ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
            )}
          </svg>
        </button>
      </header>

      {/* Desktop Sidebar Navigation */}
      <aside className={`fixed lg:static inset-y-0 left-0 z-40 w-64 bg-surface-900 border-r border-slate-800/80 flex flex-col justify-between transform transition-transform duration-200 ease-in-out ${
        mobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
      }`}>
        <div>
          {/* Logo & Brand */}
          <div className="p-6 hidden lg:flex items-center gap-3 border-b border-slate-800/60">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-brand-600 to-accent-500 flex items-center justify-center font-bold text-white shadow-lg shadow-brand-600/30">
              S
            </div>
            <div>
              <h1 className="font-bold text-base tracking-tight text-white leading-none">Skyline Club</h1>
              <span className="text-xs text-slate-400">Student Association</span>
            </div>
          </div>

          {/* Navigation Items */}
          <nav className="p-4 space-y-1.5 overflow-y-auto">
            {combinedNav.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 ${
                    isActive
                      ? 'bg-brand-600/20 text-brand-300 border border-brand-500/30 font-semibold'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                  }`}
                >
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* User Footer in Sidebar */}
        <div className="p-4 border-t border-slate-800/80 bg-surface-950/40">
          {isAuthenticated ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-white truncate max-w-[130px]">{user?.name || user?.username}</p>
                  <p className="text-xs text-slate-400 truncate max-w-[130px]">{user?.email}</p>
                </div>
                <Badge variant={getBadgeVariant(user?.role)}>
                  {user?.role}
                </Badge>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start text-xs text-slate-400 hover:text-danger-500"
                onClick={() => {
                  logout();
                  navigate('/login');
                }}
              >
                Sign Out
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              <Link to="/login" className="w-full block">
                <Button variant="primary" size="sm" className="w-full">
                  Sign In
                </Button>
              </Link>
              <Link to="/register" className="w-full block">
                <Button variant="outline" size="sm" className="w-full">
                  Create Account
                </Button>
              </Link>
            </div>
          )}
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Desktop Topbar */}
        <header className="hidden lg:flex items-center justify-between bg-surface-900/40 backdrop-blur-md border-b border-slate-800/60 px-8 py-4">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-semibold text-slate-100">
              Skyline Student Association Platform
            </h2>
          </div>
          <div className="flex items-center gap-3">
            {isAuthenticated ? (
              <div className="flex items-center gap-3 bg-surface-800/60 border border-slate-700/60 px-3.5 py-1.5 rounded-full">
                <span className="text-xs font-medium text-slate-300">{user?.name}</span>
                <Badge variant={getBadgeVariant(user?.role)}>
                  {user?.role_display || user?.role}
                </Badge>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link to="/login">
                  <Button variant="ghost" size="sm">Sign In</Button>
                </Link>
                <Link to="/register">
                  <Button variant="primary" size="sm">Join Club</Button>
                </Link>
              </div>
            )}
          </div>
        </header>

        {/* Dynamic Route Content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
