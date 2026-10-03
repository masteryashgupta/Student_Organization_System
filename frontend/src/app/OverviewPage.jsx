import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../lib/AuthContext';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import {
  Calendar,
  ShoppingBag,
  Users,
  DollarSign,
  Megaphone,
  CheckSquare,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  QrCode,
  TrendingUp,
  Award,
  Layers,
  CheckCircle2,
  Clock,
  Zap,
} from 'lucide-react';

export default function OverviewPage() {
  const { user, isAuthenticated, isOfficer } = useAuth();

  return (
    <div className="w-full">
      {/* 1. HERO SECTION (Pure White Background with Generous Whitespace) */}
      <section className="bg-white pt-14 sm:pt-20 lg:pt-24 pb-8 sm:pb-12 px-4 sm:px-6 lg:px-8 text-center relative">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Main Hero Headline in Caveat 700: 64–88px desktop, 40–52px mobile, line-height 1.0–1.15 */}
          <h1 className="font-odoo-script font-display text-[44px] sm:text-[66px] lg:text-[84px] font-bold text-ink leading-[1.06] tracking-normal max-w-4xl mx-auto">
            All your club operations on{' '}
            <span className="odoo-yellow-highlight">one platform.</span>
          </h1>

          {/* Subtitle in Caveat 700: 42–60px desktop, 30–40px mobile */}
          <div className="relative inline-block pt-1">
            <h2 className="font-odoo-script font-display text-[32px] sm:text-[44px] lg:text-[56px] font-bold text-ink tracking-normal leading-[1.08] inline-block">
              Simple, efficient, yet{' '}
              <span className="odoo-blue-underline">affordable!</span>
            </h2>

            {/* Exact Odoo-Style Arrow Doodle & Handwritten Price Note */}
            <div className="hidden xl:flex items-center gap-2 absolute -right-52 top-1/2 -translate-y-2 rotate-[4deg] font-odoo-script font-display text-sm sm:text-base text-[#714B67] leading-tight text-left">
              <img
                src="/img/arrow_doodle.svg"
                className="w-8 h-10 shrink-0"
                alt=""
                loading="lazy"
              />
              <div>
                <span className="font-bold text-[#714B67] text-base block">$15.00 / year</span>
                <span className="text-xs text-[#66636A]">for ALL perks</span>
              </div>
            </div>
          </div>

          {/* Hero Call-to-Actions (Comfortably sized, plum primary + light neutral secondary) */}
          <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4">
            <Link to="/events" className="w-full sm:w-auto">
              <button
                type="button"
                className="w-full sm:w-auto font-sans font-semibold px-7 py-3 rounded-xl text-[15px] sm:text-[16px] bg-[#714B67] hover:bg-[#5B3B52] text-white shadow-sm hover:shadow transition-all"
              >
                Start now - It's free
              </button>
            </Link>

            {!isAuthenticated ? (
              <Link to="/register" className="w-full sm:w-auto">
                <button
                  type="button"
                  className="w-full sm:w-auto font-sans font-semibold px-7 py-3 rounded-xl text-[15px] sm:text-[16px] bg-[#F3F3F5] hover:bg-[#EAE7E3] text-[#382533] border border-border/70 transition-all"
                >
                  Meet an advisor
                </button>
              </Link>
            ) : (
              <Link to="/store" className="w-full sm:w-auto">
                <button
                  type="button"
                  className="w-full sm:w-auto font-sans font-semibold px-7 py-3 rounded-xl text-[15px] sm:text-[16px] bg-[#F3F3F5] hover:bg-[#EAE7E3] text-[#382533] border border-border/70 transition-all"
                >
                  Visit Club Store
                </button>
              </Link>
            )}
          </div>
        </div>
      </section>

      {/* Broad, Gentle Curved Edge Transitioning into Very Light-Gray Lower Canvas */}
      <div className="w-full overflow-hidden leading-none bg-white -mb-px">
        <svg
          viewBox="0 0 1440 80"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-10 sm:h-16 lg:h-20 block"
          preserveAspectRatio="none"
        >
          <path
            d="M0,80 Q720,0 1440,80 L1440,80 L0,80 Z"
            fill="#F4F6F8"
          />
        </svg>
      </div>

      {/* 2. LOWER CONTENT SECTION (Very Light Cool Gray Canvas) */}
      <section className="bg-[#F4F6F8] pb-24 sm:pb-32 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto space-y-16 sm:space-y-24">
          {/* Floating Announcement / Event Link in small white pill with subtle shadow */}
          <div className="flex justify-center -mt-5 sm:-mt-8 mb-4 sm:mb-8 relative z-10">
            <Link
              to="/events"
              className="group inline-flex items-center gap-2.5 sm:gap-4 px-5 sm:px-7 py-2.5 rounded-full bg-white border border-[#E9E7E5] shadow-[0_2px_12px_rgba(0,0,0,0.06)] hover:border-[#F8B500] hover:shadow-[0_4px_18px_rgba(0,0,0,0.09)] transition-all text-xs sm:text-sm text-ink"
            >
              <span className="text-base">🎓</span>
              <span className="font-semibold text-ink truncate max-w-[200px] sm:max-w-none">
                Skyline Leadership Gala &amp; Dinner
              </span>
              <span className="text-ink-muted text-xs hidden sm:inline">Oct 24, 2026</span>
              <span className="text-[#714B67] font-semibold flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                Register ⟶
              </span>
            </Link>
          </div>

          {/* Balanced Row of White Tiles with Simple Colorful Icons (Screenshot App Launcher Row) */}
          <div className="pt-2 sm:pt-4">
          <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-5">
            {/* App 1: Ticketing (%) */}
            <Link to="/events" className="group flex flex-col items-center">
              <div className="w-18 h-18 sm:w-20 sm:h-20 rounded-2xl bg-white border border-border shadow-sm flex items-center justify-center group-hover:scale-105 group-hover:-translate-y-1 group-hover:shadow-md transition-all">
                <div className="w-10 h-10 rounded-xl bg-[#FEF4F3] text-accent flex items-center justify-center font-black text-xl">
                  %
                </div>
              </div>
              <span className="mt-2 text-xs font-semibold text-ink group-hover:text-accent transition-colors">
                Tickets
              </span>
            </Link>

            {/* App 2: Members (Ribbon Bookmark) */}
            <Link to="/members" className="group flex flex-col items-center">
              <div className="w-18 h-18 sm:w-20 sm:h-20 rounded-2xl bg-white border border-border shadow-sm flex items-center justify-center group-hover:scale-105 group-hover:-translate-y-1 group-hover:shadow-md transition-all">
                <div className="w-10 h-10 rounded-xl bg-[#F0FDF4] text-emerald-600 flex items-center justify-center font-bold">
                  <Users className="w-6 h-6" />
                </div>
              </div>
              <span className="mt-2 text-xs font-semibold text-ink group-hover:text-brand transition-colors">
                Members
              </span>
            </Link>

            {/* App 3: Store (Bag) */}
            <Link to="/store" className="group flex flex-col items-center">
              <div className="w-18 h-18 sm:w-20 sm:h-20 rounded-2xl bg-white border border-border shadow-sm flex items-center justify-center group-hover:scale-105 group-hover:-translate-y-1 group-hover:shadow-md transition-all">
                <div className="w-10 h-10 rounded-xl bg-[#FFFBEB] text-amber-600 flex items-center justify-center font-bold">
                  <ShoppingBag className="w-6 h-6" />
                </div>
              </div>
              <span className="mt-2 text-xs font-semibold text-ink group-hover:text-amber-600 transition-colors">
                Store
              </span>
            </Link>

            {/* App 4: Treasury (Ledger / Dollar) */}
            <Link to="/finance" className="group flex flex-col items-center">
              <div className="w-18 h-18 sm:w-20 sm:h-20 rounded-2xl bg-white border border-border shadow-sm flex items-center justify-center group-hover:scale-105 group-hover:-translate-y-1 group-hover:shadow-md transition-all">
                <div className="w-10 h-10 rounded-xl bg-[#F9F5F8] text-[#714B67] flex items-center justify-center font-bold">
                  <DollarSign className="w-6 h-6" />
                </div>
              </div>
              <span className="mt-2 text-xs font-semibold text-ink group-hover:text-[#714B67] transition-colors">
                Treasury
              </span>
            </Link>

            {/* App 5: Scanner (QR / Shield) */}
            <Link to="/events/checkin" className="group flex flex-col items-center">
              <div className="w-18 h-18 sm:w-20 sm:h-20 rounded-2xl bg-white border border-border shadow-sm flex items-center justify-center group-hover:scale-105 group-hover:-translate-y-1 group-hover:shadow-md transition-all">
                <div className="w-10 h-10 rounded-xl bg-[#EFF6FF] text-blue-600 flex items-center justify-center font-bold">
                  <ShieldCheck className="w-6 h-6" />
                </div>
              </div>
              <span className="mt-2 text-xs font-semibold text-ink group-hover:text-blue-600 transition-colors">
                Scanner
              </span>
            </Link>

            {/* App 6: Broadcast (Megaphone) */}
            <Link to="/announcements" className="group flex flex-col items-center">
              <div className="w-18 h-18 sm:w-20 sm:h-20 rounded-2xl bg-white border border-border shadow-sm flex items-center justify-center group-hover:scale-105 group-hover:-translate-y-1 group-hover:shadow-md transition-all">
                <div className="w-10 h-10 rounded-xl bg-[#FEF2F2] text-rose-600 flex items-center justify-center font-bold">
                  <Megaphone className="w-6 h-6" />
                </div>
              </div>
              <span className="mt-2 text-xs font-semibold text-ink group-hover:text-rose-600 transition-colors">
                Broadcast
              </span>
            </Link>
          </div>
        </div>

        {/* Live Product Preview Panel (Real Product UI Showcase) */}
        <div className="pt-6 sm:pt-8">
          <div className="bg-white border border-border rounded-2xl sm:rounded-3xl p-4 sm:p-8 shadow-odoo-card max-w-4xl mx-auto text-left relative overflow-hidden">
            {/* Top Browser Bar */}
            <div className="flex items-center justify-between pb-6 border-b border-border/70 mb-6">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-[#E9E7E5] inline-block" />
                <span className="w-3 h-3 rounded-full bg-[#E9E7E5] inline-block" />
                <span className="w-3 h-3 rounded-full bg-[#E9E7E5] inline-block" />
                <span className="text-xs font-mono text-ink-subtle ml-2">skyline.club/portal</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-xs text-ink-muted font-medium">Postgres Live Sync</span>
              </div>
            </div>

            {/* Interactive Preview Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Preview 1: Live Event Card */}
              <div className="p-4 rounded-xl bg-canvas border border-border space-y-3">
                <div className="flex items-center justify-between">
                  <Badge variant="success" size="sm">Open for RSVP</Badge>
                  <span className="text-[11px] text-ink-muted">In 2 weeks</span>
                </div>
                <div>
                  <h4 className="font-semibold text-ink text-sm">Spring Leadership Gala</h4>
                  <p className="text-xs text-ink-muted mt-0.5">Grand Ballroom &bull; Formal Dinner</p>
                </div>
                <div className="flex items-center justify-between text-xs pt-2 border-t border-border/80">
                  <span className="text-ink-muted">Member Price:</span>
                  <span className="font-bold text-accent text-sm">$15.00</span>
                </div>
              </div>

              {/* Preview 2: Cryptographic QR Check-In Pass */}
              <div className="p-4 rounded-xl bg-canvas border border-border space-y-3 flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-ink flex items-center gap-1.5">
                    <QrCode className="w-3.5 h-3.5 text-brand" />
                    Encrypted Gate Pass
                  </span>
                  <Badge variant="primary" size="sm">Valid</Badge>
                </div>
                <div className="p-2.5 bg-white rounded-lg border border-border flex items-center justify-center">
                  <div className="text-center space-y-1">
                    <span className="font-mono text-[10px] text-ink-muted tracking-widest block">
                      UUID #4f8a-92b1
                    </span>
                    <span className="text-[11px] font-semibold text-brand block">
                      Scan at Entrance
                    </span>
                  </div>
                </div>
                <p className="text-[11px] text-ink-muted text-center">
                  Zero duplicate check-ins via row-level locks
                </p>
              </div>

              {/* Preview 3: Central Ledger Record */}
              <div className="p-4 rounded-xl bg-canvas border border-border space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-ink flex items-center gap-1.5">
                    <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
                    Treasury Ledger
                  </span>
                  <Badge variant="neutral" size="sm">Auto-Audit</Badge>
                </div>
                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between py-1 border-b border-border/60">
                    <span className="text-ink-muted">Gala Ticket Income</span>
                    <span className="font-bold text-emerald-600">+$2,950.00</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-border/60">
                    <span className="text-ink-muted">Store Hoodies Sales</span>
                    <span className="font-bold text-emerald-600">+$1,420.00</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-ink-muted">Active Reimbursements</span>
                    <span className="font-bold text-amber-600">-$340.00</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 3. PRODUCT CAPABILITIES & APP DIRECTORY (Odoo App Tiles Grid) */}
      <section className="space-y-8">
        <div className="text-center max-w-2xl mx-auto space-y-2">
          {/* Secondary script headline: 42–60px desktop and 30–40px mobile */}
          <h2 className="text-[26px] sm:text-[32px] font-bold text-ink tracking-tight leading-[1.15]">
            One platform,{' '}
            <span className="font-display text-[32px] sm:text-[44px] lg:text-[50px] font-bold text-brand leading-[1.08] inline-block">
              endless capabilities.
            </span>
          </h2>
          <p className="text-sm sm:text-base text-ink-muted leading-relaxed">
            All 6 specialized club apps connect to the same central database, ensuring zero spreadsheet discrepancies.
          </p>
        </div>

        {/* 6 Clean Feature Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Card 1: Events & Ticketing */}
          <Link to="/events" className="group block">
            <Card className="h-full hover:border-accent/40 transition-all p-7 space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-accent-50 border border-accent-200 flex items-center justify-center text-accent group-hover:scale-105 transition-transform">
                <Calendar className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-[20px] font-semibold text-ink group-hover:text-accent transition-colors">
                  Events & Ticketing
                </h3>
                <p className="text-sm text-ink-muted mt-1 leading-relaxed">
                  Publish campus galas and speaker sessions. Enforce capacity limits under concurrency and provide instant digital passes.
                </p>
              </div>
              <div className="flex items-center gap-1.5 text-xs font-semibold text-accent pt-2">
                <span>Browse galas & tickets</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
              </div>
            </Card>
          </Link>

          {/* Card 2: Club Membership System */}
          <Link to="/members" className="group block">
            <Card className="h-full hover:border-brand/40 transition-all p-7 space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-brand-50 border border-brand-200 flex items-center justify-center text-brand group-hover:scale-105 transition-transform">
                <Users className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-ink group-hover:text-brand transition-colors">
                  Membership & Dues
                </h3>
                <p className="text-sm text-ink-muted mt-1 leading-relaxed">
                  Bronze, Silver, and Gold membership tiers with automatic ticket discounts, verified student IDs, and member portals.
                </p>
              </div>
              <div className="flex items-center gap-1.5 text-xs font-semibold text-brand pt-2">
                <span>View membership plans</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
              </div>
            </Card>
          </Link>

          {/* Card 3: Club Merchandise Store */}
          <Link to="/store" className="group block">
            <Card className="h-full hover:border-amber-400/40 transition-all p-7 space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 group-hover:scale-105 transition-transform">
                <ShoppingBag className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-ink group-hover:text-amber-600 transition-colors">
                  Merch Store & Checkout
                </h3>
                <p className="text-sm text-ink-muted mt-1 leading-relaxed">
                  Official Skyline hoodies, shirts, and stickers. Complete with cart drawer, stock deduction, and order receipts.
                </p>
              </div>
              <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-600 pt-2">
                <span>Shop club apparel</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
              </div>
            </Card>
          </Link>

          {/* Card 4: Treasury & Finance Ledger */}
          <Link to="/finance" className="group block">
            <Card className="h-full hover:border-success-500/40 transition-all p-7 space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-success-50 border border-success-100 flex items-center justify-center text-success-600 group-hover:scale-105 transition-transform">
                <DollarSign className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-ink group-hover:text-success-600 transition-colors">
                  Treasury & Accounting
                </h3>
                <p className="text-sm text-ink-muted mt-1 leading-relaxed">
                  Single source of financial truth. Automatically audits ticket and merch revenue against volunteer expense claims.
                </p>
              </div>
              <div className="flex items-center gap-1.5 text-xs font-semibold text-success-600 pt-2">
                <span>View executive ledger</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
              </div>
            </Card>
          </Link>

          {/* Card 5: Field QR Check-In Scanner */}
          <Link to="/events/checkin" className="group block">
            <Card className="h-full hover:border-brand/40 transition-all p-7 space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-purple-50 border border-purple-200 flex items-center justify-center text-brand group-hover:scale-105 transition-transform">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-ink group-hover:text-brand transition-colors">
                  Mobile Field Check-In
                </h3>
                <p className="text-sm text-ink-muted mt-1 leading-relaxed">
                  Camera-based QR scanning directly from officer phones with instant sound chimes and live attendance counters.
                </p>
              </div>
              <div className="flex items-center gap-1.5 text-xs font-semibold text-brand pt-2">
                <span>Open gate scanner</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
              </div>
            </Card>
          </Link>

          {/* Card 6: Broadcast Announcements */}
          <Link to="/announcements" className="group block">
            <Card className="h-full hover:border-blue-400/40 transition-all p-7 space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 group-hover:scale-105 transition-transform">
                <Megaphone className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-ink group-hover:text-blue-600 transition-colors">
                  Campus Broadcast Feed
                </h3>
                <p className="text-sm text-ink-muted mt-1 leading-relaxed">
                  Official announcements, newsletters, and email mailing lists for keeping the university student body informed.
                </p>
              </div>
              <div className="flex items-center gap-1.5 text-xs font-semibold text-blue-600 pt-2">
                <span>Read announcements</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
              </div>
            </Card>
          </Link>
        </div>
      </section>

      {/* 3. BENEFITS & WORKFLOW SECTION */}
      <section className="bg-white rounded-3xl border border-border p-8 sm:p-12 space-y-10 shadow-odoo-card">
        <div className="text-center max-w-xl mx-auto space-y-2">
          <Badge variant="accent">Simple Student Workflow</Badge>
          <h2 className="text-2xl sm:text-3xl font-bold text-ink">
            How Skyline Club works
          </h2>
          <p className="text-sm text-ink-muted">
            Designed for frictionless student participation and stress-free officer administration.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center md:text-left">
          {/* Step 1 */}
          <div className="space-y-3 p-5 rounded-2xl bg-canvas border border-border/70">
            <div className="w-10 h-10 rounded-xl bg-accent text-white font-bold flex items-center justify-center text-sm shadow-sm mx-auto md:mx-0">
              1
            </div>
            <h3 className="font-bold text-base text-ink">Join & Verify Membership</h3>
            <p className="text-xs text-ink-muted leading-relaxed">
              Create an account, select an annual tier, and receive a verified student ID badge that unlocks store and event discounts.
            </p>
          </div>

          {/* Step 2 */}
          <div className="space-y-3 p-5 rounded-2xl bg-canvas border border-border/70">
            <div className="w-10 h-10 rounded-xl bg-brand text-white font-bold flex items-center justify-center text-sm shadow-sm mx-auto md:mx-0">
              2
            </div>
            <h3 className="font-bold text-base text-ink">Purchase & Get Encrypted QR</h3>
            <p className="text-xs text-ink-muted leading-relaxed">
              Reserve gala seats in real time. Transactions are verified and a cryptographic QR pass is generated for quick door admission.
            </p>
          </div>

          {/* Step 3 */}
          <div className="space-y-3 p-5 rounded-2xl bg-canvas border border-border/70">
            <div className="w-10 h-10 rounded-xl bg-odoo-teal text-white font-bold flex items-center justify-center text-sm shadow-sm mx-auto md:mx-0">
              3
            </div>
            <h3 className="font-bold text-base text-ink">Transparent Campus Ledger</h3>
            <p className="text-xs text-ink-muted leading-relaxed">
              All revenue feeds into central double-entry ledger. Officers can review attendance rates and print audit reports instantly.
            </p>
          </div>
        </div>
      </section>

      {/* 4. VERIFIED METRICS PROOF STRIP */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
        <div className="p-6 rounded-2xl bg-white border border-border shadow-odoo-card text-center space-y-1">
          <span className="text-3xl sm:text-4xl font-black text-accent tracking-tight block">
            100%
          </span>
          <span className="text-xs text-ink-muted font-medium">Real-Time DB Sync</span>
        </div>

        <div className="p-6 rounded-2xl bg-white border border-border shadow-odoo-card text-center space-y-1">
          <span className="text-3xl sm:text-4xl font-black text-brand tracking-tight block">
            0
          </span>
          <span className="text-xs text-ink-muted font-medium">Spreadsheet Collisions</span>
        </div>

        <div className="p-6 rounded-2xl bg-white border border-border shadow-odoo-card text-center space-y-1">
          <span className="text-3xl sm:text-4xl font-black text-odoo-teal tracking-tight block">
            6
          </span>
          <span className="text-xs text-ink-muted font-medium">Connected Modules</span>
        </div>

        <div className="p-6 rounded-2xl bg-white border border-border shadow-odoo-card text-center space-y-1">
          <span className="text-3xl sm:text-4xl font-black text-ink tracking-tight block">
            &lt; 3s
          </span>
          <span className="text-xs text-ink-muted font-medium">Gate QR Scan Time</span>
        </div>
      </section>

      {/* 5. CLOSING CTA BANNER (Odoo Warm Clean Banner) */}
      <section className="rounded-3xl bg-gradient-to-br from-[#FAF9F7] via-white to-[#F9F5F8] border border-border p-8 sm:p-14 text-center space-y-6 shadow-odoo-card">
        <div className="max-w-2xl mx-auto space-y-3">
          {/* Secondary script headline: 42–60px desktop and 30–40px mobile */}
          <h2 className="font-display text-[32px] sm:text-[44px] lg:text-[52px] font-bold text-ink tracking-tight leading-[1.1]">
            Ready to experience <span className="marker-highlight text-accent">effortless campus life?</span>
          </h2>
          <p className="text-sm sm:text-base text-ink-muted leading-relaxed">
            Join thousands of Skyline students attending events, wearing official merch, and participating in club governance.
          </p>
        </div>

        <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link to="/events" className="w-full sm:w-auto">
            <Button variant="primary" size="lg" className="w-full sm:w-auto px-8 font-semibold shadow-md">
              View Events Schedule
            </Button>
          </Link>
          {!isAuthenticated ? (
            <Link to="/register" className="w-full sm:w-auto">
              <Button variant="outline" size="lg" className="w-full sm:w-auto px-8 font-semibold">
                Sign Up as Member
              </Button>
            </Link>
          ) : (
            <Link to="/members" className="w-full sm:w-auto">
              <Button variant="outline" size="lg" className="w-full sm:w-auto px-8 font-semibold">
                My Membership
              </Button>
            </Link>
          )}
        </div>
      </section>
        </div>
      </section>
    </div>
  );
}
