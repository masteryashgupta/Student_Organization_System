import React, { useState } from 'react';
import { Link, useLocation, useNavigate, Outlet } from 'react-router-dom';
import { useAuth } from '../lib/AuthContext';
import { useTheme } from '../lib/ThemeContext';
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
  const { theme, toggleTheme, isDark } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();

  const navItems = getRegisteredNavItems(user?.role || 'public');

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

  const combinedNav = React.useMemo(() => {
    const raw = [
      { path: '/', label: 'Overview', icon: Home },
      ...navItems.map((item) => ({
        ...item,
        icon: getNavIcon(item.path),
      })),
    ];
    const seen = new Set();
    return raw.filter((item) => {
      if (!item.path || seen.has(item.path)) return false;
      seen.add(item.path);
      return true;
    });
  }, [navItems]);

  return (
    <div className="min-h-screen flex flex-col text-slate-900 dark:text-slate-100 selection:bg-brand-600 selection:text-white overflow-x-hidden max-w-full relative transition-colors duration-300">
      {/* Background ambient lighting orbs for glassmorphism depth */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10">
        <div className="absolute -top-32 left-1/4 w-96 h-96 bg-brand-500/15 dark:bg-brand-400/20 rounded-full blur-3xl filter transform-gpu" />
        <div className="absolute top-1/3 -right-20 w-80 h-80 bg-cyan-400/15 dark:bg-cyan-500/15 rounded-full blur-3xl filter transform-gpu" />
        <div className="absolute -bottom-20 left-1/3 w-96 h-96 bg-indigo-500/15 dark:bg-violet-600/15 rounded-full blur-3xl filter transform-gpu" />
      </div>

      {/* Top Floating Bar Header */}
      <header className="sticky top-0 z-50 w-full pt-3 sm:pt-4 pb-2 px-4 sm:px-6 pointer-events-none">
        <div className="max-w-7xl mx-auto flex items-center justify-between pointer-events-auto gap-3">
          {/* Top-Left: Location / Campus Status */}
          <div className="flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-white/70 dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200/80 dark:border-white/10 text-xs font-semibold text-slate-600 dark:text-slate-300 shrink-0 shadow-xs">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="hidden sm:inline">Skyline Campus • Room 204</span>
            <span className="sm:hidden font-mono text-[11px]">Skyline OS</span>
          </div>

          {/* Top-Center: FLOATING PILL NAVBAR */}
          <nav
            className="hidden md:inline-flex items-center gap-1 px-3 py-1.5 rounded-full pill-navbar max-w-[calc(100vw-340px)] overflow-x-auto whitespace-nowrap scrollbar-none"
            aria-label="Main Navigation"
          >
            {/* Home circular button */}
            <Link
              to="/"
              className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200 ${
                location.pathname === '/'
                  ? 'bg-gradient-to-r from-brand-600 to-indigo-600 text-white shadow-md shadow-brand-500/25'
                  : 'bg-slate-100/80 dark:bg-white/5 text-slate-600 dark:text-slate-300 hover:bg-slate-200/80 dark:hover:bg-white/10 hover:text-slate-900 dark:hover:text-white'
              }`}
              title="Overview Home"
            >
              <Home className="w-4 h-4" />
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
                    className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all duration-200 ${
                      isActive
                        ? 'bg-gradient-to-r from-brand-600 to-indigo-600 text-white shadow-md shadow-brand-500/25'
                        : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-brand-50/80 dark:hover:bg-white/10'
                    }`}
                  >
                    <IconComponent className="w-3.5 h-3.5 opacity-80" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}

            {/* Vertical Divider */}
            <div className="h-4 w-[1px] bg-slate-200/80 dark:bg-white/10 mx-1"></div>

            {/* Dark / Light Theme Toggle Button */}
            <button
              type="button"
              onClick={toggleTheme}
              className="w-8 h-8 rounded-full flex items-center justify-center text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"
              title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            >
              {isDark ? (
                <Sun className="w-4 h-4 text-amber-400" />
              ) : (
                <Moon className="w-4 h-4" />
              )}
            </button>
          </nav>

          {/* Top-Right: User Profile & Actions */}
          <div className="flex items-center gap-2 shrink-0">
            {isAuthenticated ? (
              <div className="flex items-center gap-2">
                <Link
                  to="/members/me"
                  className="flex items-center gap-2 pl-2 pr-3.5 py-1.5 rounded-full bg-white/80 dark:bg-slate-900/70 backdrop-blur-xl border border-slate-200/80 dark:border-white/10 shadow-sm hover:border-brand-300 dark:hover:border-white/25 transition-all text-xs font-semibold text-slate-800 dark:text-slate-200"
                >
                  <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-brand-600 to-indigo-600 text-white flex items-center justify-center font-bold text-[10px] shadow-xs">
                    {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
                  </div>
                  <span className="hidden sm:inline max-w-[100px] truncate">
                    {user?.name || user?.username}
                  </span>
                </Link>

                <button
                  onClick={() => {
                    logout();
                    navigate('/');
                  }}
                  className="w-8 h-8 rounded-full flex items-center justify-center bg-white/70 dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200/80 dark:border-white/10 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-white dark:hover:bg-slate-800 transition-colors shadow-xs"
                  title="Sign Out"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  to="/login"
                  className="text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white px-3 py-1.5 transition-colors"
                >
                  Sign In
                </Link>
                <Link
                  to="/register"
                  className="text-xs font-bold text-white bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-700 hover:to-indigo-700 px-4 py-2 rounded-full shadow-md shadow-brand-500/25 hover:shadow-lg transition-all"
                >
                  Join Club
                </Link>
              </div>
            )}

            {/* Mobile Theme Toggle Button */}
            <button
              type="button"
              onClick={toggleTheme}
              className="md:hidden w-8 h-8 rounded-full flex items-center justify-center bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200/80 dark:border-white/10 text-slate-600 dark:text-slate-300 shadow-xs"
              title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            >
              {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
            </button>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden w-8 h-8 rounded-full flex items-center justify-center bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200/80 dark:border-white/10 text-slate-600 dark:text-slate-300 shadow-xs"
              aria-label="Toggle Menu"
            >
              {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="md:hidden mt-2 p-4 rounded-3xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl border border-slate-200/80 dark:border-white/10 shadow-2xl space-y-2 pointer-events-auto animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="grid grid-cols-2 gap-2">
              {combinedNav.map((item) => {
                const isActive = location.pathname === item.path;
                const IconComponent = item.icon;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-2xl text-xs font-semibold transition-all ${
                      isActive
                        ? 'bg-gradient-to-r from-brand-600 to-indigo-600 text-white shadow-sm'
                        : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5'
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

      {/* Minimalist Glass Footer */}
      <footer className="w-full border-t border-slate-200/80 dark:border-white/10 bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl mt-auto py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500 dark:text-slate-400">
          <div className="flex items-center gap-2.5">
            <div className="w-6 h-6 rounded-lg bg-gradient-to-tr from-brand-600 to-indigo-600 text-white flex items-center justify-center font-bold text-[11px] shadow-xs">
              S
            </div>
            <span className="font-bold text-slate-900 dark:text-white">Skyline Student Association</span>
            <span>•</span>
            <span>Est. 2024</span>
          </div>

          <div className="flex items-center gap-5 font-semibold">
            <Link to="/events" className="hover:text-slate-900 dark:hover:text-white transition-colors">Events</Link>
            <Link to="/store" className="hover:text-slate-900 dark:hover:text-white transition-colors">Merch</Link>
            <Link to="/members" className="hover:text-slate-900 dark:hover:text-white transition-colors">Join Us</Link>
            <Link to="/announcements" className="hover:text-slate-900 dark:hover:text-white transition-colors">News</Link>
          </div>

          <p className="text-[11px] text-slate-400 dark:text-slate-500 font-medium">
            Modern Glass UI • Odoo SOS
          </p>
        </div>
      </footer>
    </div>
  );
}

