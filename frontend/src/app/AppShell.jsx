import React, { useState } from 'react';
import { Link, useLocation, useNavigate, Outlet } from 'react-router-dom';
import { useAuth } from '../lib/AuthContext';
import { getRegisteredNavItems } from './routeRegistry';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import {
  Menu,
  X,
  Home,
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
  Moon,
  Sun,
  MapPin,
  ExternalLink,
  RotateCw,
} from 'lucide-react';

export default function AppShell() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { user, logout, isAuthenticated, isOfficer } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const navItems = getRegisteredNavItems(user?.role || 'public');

  const defaultNavItems = [
    { path: '/', label: 'Overview', icon: Home },
  ];

  // Helper to map icons for each route
  const getNavIcon = (path) => {
    if (path === '/') return Home;
    if (path.includes('event')) return Calendar;
    if (path.includes('finance')) return DollarSign;
    if (path.includes('member')) return Users;
    if (path.includes('announcement')) return Megaphone;
    if (path.includes('store')) return ShoppingBag;
    if (path.includes('task')) return CheckSquare;
    return Sparkles;
  };

  const combinedNav = [
    { path: '/', label: 'Overview', icon: Home },
    ...navItems.map((item) => ({
      ...item,
      icon: getNavIcon(item.path),
    })),
  ];

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
    <div className="min-h-screen flex flex-col text-[#0F172A] selection:bg-[#0EA5E9] selection:text-white">
      {/* Top Floating Bar Header (Once UI Minimalist Style) */}
      <header className="sticky top-0 z-50 w-full pt-3 sm:pt-4 pb-2 px-4 sm:px-6 pointer-events-none">
        <div className="max-w-7xl mx-auto flex items-center justify-between pointer-events-auto">
          {/* Top-Left: Location / Campus Status (like "Asia/Jakarta" in reference) */}
          <div className="flex items-center gap-2 text-xs font-semibold text-[#64748B] shrink-0">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="hidden sm:inline">Skyline Campus • Room 204</span>
            <span className="sm:hidden font-mono">Skyline OS</span>
          </div>

          {/* Top-Center: FLOATING PILL NAVBAR */}
          <nav
            className="hidden md:inline-flex items-center gap-1 px-3 py-1.5 rounded-full pill-navbar"
            aria-label="Main Navigation"
          >
            {/* Home circular button */}
            <Link
              to="/"
              className={`w-7 h-7 rounded-full flex items-center justify-center transition-all ${
                location.pathname === '/'
                  ? 'bg-[#0F172A] text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900'
              }`}
              title="Overview Home"
            >
              <Home className="w-3.5 h-3.5" />
            </Link>

            {/* Nav Links */}
            {combinedNav
              .filter((item) => item.path !== '/')
              .map((item) => {
                const isActive = location.pathname.startsWith(item.path);
                const IconComponent = item.icon;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold transition-all ${
                      isActive
                        ? 'bg-[#0F172A] text-white shadow-sm'
                        : 'text-[#64748B] hover:text-[#0F172A] hover:bg-slate-100/70'
                    }`}
                  >
                    <IconComponent className="w-3.5 h-3.5 opacity-80" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}

            {/* Vertical Divider */}
            <div className="h-4 w-[1px] bg-slate-200/80 mx-1"></div>

            {/* Quick action / Theme indicator (Moon icon like reference) */}
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="w-7 h-7 rounded-full flex items-center justify-center text-slate-500 hover:text-[#0F172A] hover:bg-slate-100 transition-colors"
              title="Refresh platform"
            >
              <Moon className="w-3.5 h-3.5" />
            </button>
          </nav>

          {/* Top-Right: User Profile & Actions */}
          <div className="flex items-center gap-2 shrink-0">
            {isAuthenticated ? (
              <div className="flex items-center gap-2">
                <Link
                  to="/members/me"
                  className="flex items-center gap-2 pl-2 pr-3 py-1 rounded-full bg-white/90 border border-slate-200/80 shadow-sm hover:border-slate-300 transition-all text-xs font-medium"
                >
                  <div className="w-6 h-6 rounded-full bg-[#0F172A] text-white flex items-center justify-center font-bold text-[10px]">
                    {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
                  </div>
                  <span className="hidden sm:inline font-semibold text-[#0F172A] max-w-[100px] truncate">
                    {user?.name || user?.username}
                  </span>
                </Link>

                <button
                  onClick={() => {
                    logout();
                    navigate('/');
                  }}
                  className="p-1.5 rounded-full text-slate-400 hover:text-rose-600 hover:bg-white transition-colors"
                  title="Sign Out"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  to="/login"
                  className="text-xs font-semibold text-[#64748B] hover:text-[#0F172A] px-3 py-1.5"
                >
                  Sign In
                </Link>
                <Link
                  to="/register"
                  className="text-xs font-bold text-white bg-[#0F172A] hover:bg-slate-800 px-3.5 py-1.5 rounded-full shadow-sm"
                >
                  Join Club
                </Link>
              </div>
            )}

            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-1.5 rounded-full bg-white/90 border border-slate-200 text-slate-600 hover:text-slate-900"
              aria-label="Toggle Menu"
            >
              {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="md:hidden mt-2 p-4 rounded-3xl bg-white/95 backdrop-blur-xl border border-slate-200 shadow-xl space-y-2 pointer-events-auto animate-fade-in">
            <div className="grid grid-cols-2 gap-1.5">
              {combinedNav.map((item) => {
                const isActive = location.pathname === item.path;
                const IconComponent = item.icon;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-2xl text-xs font-semibold ${
                      isActive
                        ? 'bg-[#0F172A] text-white'
                        : 'text-[#64748B] hover:bg-slate-100'
                    }`}
                  >
                    <IconComponent className="w-4 h-4" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        )}
      </header>

      {/* Main Content Viewport */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
        <Outlet />
      </main>

      {/* Minimalist Once UI Footer */}
      <footer className="w-full border-t border-slate-200/70 bg-white/50 backdrop-blur-sm mt-auto py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#64748B]">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-md bg-[#0F172A] text-white flex items-center justify-center font-bold text-[10px]">
              S
            </div>
            <span className="font-semibold text-[#0F172A]">Skyline Student Association</span>
            <span>•</span>
            <span>Est. 2024</span>
          </div>

          <div className="flex items-center gap-4 font-medium">
            <Link to="/events" className="hover:text-[#0F172A]">Events</Link>
            <Link to="/store" className="hover:text-[#0F172A]">Merch</Link>
            <Link to="/members" className="hover:text-[#0F172A]">Join Us</Link>
            <Link to="/announcements" className="hover:text-[#0F172A]">News</Link>
          </div>

          <p className="text-[11px] text-slate-400">
            Powered by Once UI Design System
          </p>
        </div>
      </footer>
    </div>
  );
}
