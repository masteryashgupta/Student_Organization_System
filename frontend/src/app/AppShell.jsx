import React, { useState } from 'react';
import { Link, useLocation, useNavigate, Outlet } from 'react-router-dom';
import { useAuth } from '../lib/AuthContext';
import { getRegisteredNavItems } from './routeRegistry';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import {
  Menu,
  X,
  Calendar,
  ShoppingBag,
  Users,
  DollarSign,
  Megaphone,
  CheckSquare,
  ShieldCheck,
  LogOut,
  Sparkles,
  ArrowRight,
  ChevronDown,
} from 'lucide-react';

export default function AppShell() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { user, logout, isAuthenticated, isOfficer } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const navItems = getRegisteredNavItems(user?.role || 'public');

  const defaultNavItems = [
    { path: '/', label: 'Overview' },
  ];

  // Consolidate main navigation items
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
    <div className="min-h-screen bg-canvas flex flex-col text-ink selection:bg-accent selection:text-white">
      {/* Top Header Navigation (Odoo SaaS Clean Style) */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-border/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 sm:h-18 flex items-center justify-between gap-4">
          {/* Brand Logo & Title */}
          <Link to="/" className="flex items-center gap-2.5 shrink-0 group" aria-label="Skyline Homepage">
            <div className="w-8 h-8 rounded-lg bg-[#714B67] flex items-center justify-center font-bold text-white shadow-sm group-hover:bg-[#5B3B52] transition-colors">
              <span className="text-sm font-bold font-sans">s</span>
            </div>
            <div className="flex items-center">
              <span className="font-bold text-xl text-ink tracking-tight font-sans">
                skyline<span className="text-[#714B67]">.</span>
              </span>
            </div>
          </Link>

          {/* Desktop Center Navigation Links */}
          <nav className="hidden lg:flex items-center gap-1 xl:gap-2" aria-label="Main Navigation">
            {combinedNav.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`px-3.5 py-1.5 rounded-lg text-[15px] font-medium transition-all ${
                    isActive
                      ? 'bg-muted text-ink font-semibold'
                      : 'text-ink-muted hover:text-ink hover:bg-muted/70'
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          {/* Right Action Area */}
          <div className="hidden lg:flex items-center gap-3">
            {isAuthenticated ? (
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2.5 bg-muted/60 border border-border pl-3 pr-2 py-1.5 rounded-full">
                  <div className="w-7 h-7 rounded-full bg-brand text-white flex items-center justify-center font-bold text-xs">
                    {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
                  </div>
                  <span className="text-xs font-semibold text-ink max-w-[120px] truncate">
                    {user?.name || user?.username}
                  </span>
                  <Badge variant={getBadgeVariant(user?.role)} size="sm">
                    {user?.role}
                  </Badge>
                </div>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    logout();
                    navigate('/login');
                  }}
                  className="text-xs text-ink-muted hover:text-danger-600"
                  title="Sign out of account"
                >
                  <LogOut className="w-3.5 h-3.5 mr-1" />
                  Sign Out
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <Link to="/login" className="px-3.5 py-2 text-[15px] font-medium text-ink-muted hover:text-ink transition-colors">
                  Sign in
                </Link>
                <Link to="/register">
                  <button
                    type="button"
                    className="font-sans font-semibold px-5 py-2 rounded-xl text-[14px] sm:text-[15px] bg-[#714B67] hover:bg-[#5B3B52] text-white shadow-sm transition-all"
                  >
                    Try it free
                  </button>
                </Link>
              </div>
            )}
          </div>

          {/* Mobile Hamburger Toggle Button */}
          <div className="flex lg:hidden items-center gap-2">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg border border-border bg-white text-ink hover:bg-muted focus:outline-none focus:ring-2 focus:ring-accent"
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Slide-Down Menu Drawer */}
        {mobileMenuOpen && (
          <div className="lg:hidden border-t border-border bg-white px-4 py-6 space-y-4 shadow-lg animate-in slide-in-from-top-2 duration-150">
            <nav className="space-y-1">
              {combinedNav.map((item) => {
                const isActive = location.pathname === item.path;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`block px-4 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-muted text-ink font-semibold border border-border'
                        : 'text-ink-muted hover:text-ink hover:bg-muted/60'
                    }`}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>

            <div className="pt-4 border-t border-border space-y-3">
              {isAuthenticated ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between px-2">
                    <div>
                      <p className="text-sm font-semibold text-ink">{user?.name || user?.username}</p>
                      <p className="text-xs text-ink-muted">{user?.email}</p>
                    </div>
                    <Badge variant={getBadgeVariant(user?.role)}>
                      {user?.role}
                    </Badge>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full text-xs text-danger-600 hover:bg-danger-50 border-danger-200"
                    onClick={() => {
                      logout();
                      setMobileMenuOpen(false);
                      navigate('/login');
                    }}
                  >
                    <LogOut className="w-3.5 h-3.5 mr-1.5" />
                    Sign Out
                  </Button>
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  <Link to="/login" onClick={() => setMobileMenuOpen(false)}>
                    <Button variant="outline" className="w-full justify-center">
                      Sign In
                    </Button>
                  </Link>
                  <Link to="/register" onClick={() => setMobileMenuOpen(false)}>
                    <button
                      type="button"
                      className="w-full py-2.5 rounded-xl font-semibold text-sm bg-[#714B67] hover:bg-[#5B3B52] text-white shadow-sm transition-all"
                    >
                      Try it free
                    </button>
                  </Link>
                </div>
              )}
            </div>
          </div>
        )}
      </header>

      {/* Main Page Canvas */}
      <main className={`flex-1 w-full ${location.pathname === '/' ? '' : 'max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10'}`}>
        <Outlet />
      </main>

      {/* Structured Odoo-Inspired Footer */}
      <footer className="bg-muted border-t border-border mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8 lg:gap-12">
            {/* Col 1: Brand Info */}
            <div className="lg:col-span-2 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-brand flex items-center justify-center font-bold text-white shadow-sm">
                  S
                </div>
                <span className="font-bold text-lg text-ink">Skyline Student Association</span>
              </div>
              <p className="text-sm text-ink-muted leading-relaxed max-w-sm">
                The open, all-in-one digital operating system for student clubs. Built for real campus galas, volunteer teams, inventory, and transparent treasury accounting.
              </p>
              <div className="flex items-center gap-2 pt-2 text-xs text-ink-subtle">
                <span className="w-2 h-2 rounded-full bg-success-500 inline-block" />
                <span>All campus operations operational & live</span>
              </div>
            </div>

            {/* Col 2: Association Modules */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-ink">
                Club Apps
              </h4>
              <ul className="space-y-2 text-sm text-ink-muted">
                <li>
                  <Link to="/events" className="hover:text-accent transition-colors">
                    Events & Galas
                  </Link>
                </li>
                <li>
                  <Link to="/store" className="hover:text-accent transition-colors">
                    Merch Store
                  </Link>
                </li>
                <li>
                  <Link to="/members" className="hover:text-accent transition-colors">
                    Membership Tiers
                  </Link>
                </li>
                <li>
                  <Link to="/announcements" className="hover:text-accent transition-colors">
                    Campus Feed
                  </Link>
                </li>
              </ul>
            </div>

            {/* Col 3: Officer Portals */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-ink">
                Officer Gate
              </h4>
              <ul className="space-y-2 text-sm text-ink-muted">
                <li>
                  <Link to="/events/checkin" className="hover:text-accent transition-colors">
                    Live QR Check-In
                  </Link>
                </li>
                <li>
                  <Link to="/events/stats" className="hover:text-accent transition-colors">
                    Attendance Analytics
                  </Link>
                </li>
                <li>
                  <Link to="/finance" className="hover:text-accent transition-colors">
                    Treasury Dashboard
                  </Link>
                </li>
                <li>
                  <Link to="/finance/reimbursements" className="hover:text-accent transition-colors">
                    Reimbursements
                  </Link>
                </li>
              </ul>
            </div>

            {/* Col 4: Platform & Support */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-ink">
                Account & Help
              </h4>
              <ul className="space-y-2 text-sm text-ink-muted">
                <li>
                  <Link to="/login" className="hover:text-accent transition-colors">
                    Member Sign In
                  </Link>
                </li>
                <li>
                  <Link to="/register" className="hover:text-accent transition-colors">
                    Register Account
                  </Link>
                </li>
                <li>
                  <Link to="/verify" className="hover:text-accent transition-colors">
                    ID Verification
                  </Link>
                </li>
                <li>
                  <span className="text-xs text-ink-subtle block pt-1">
                    Skyline University Student Union
                  </span>
                </li>
              </ul>
            </div>
          </div>

          <div className="mt-12 pt-6 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-ink-muted">
            <p>&copy; {new Date().getFullYear()} Skyline Student Association. All rights reserved.</p>
            <div className="flex items-center gap-6">
              <span>Single Unified Club Ledger</span>
              <span>•</span>
              <span>Encrypted QR Passes</span>
              <span>•</span>
              <span>Odoo-Inspired SaaS Experience</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
