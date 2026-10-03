import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../lib/AuthContext';
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
  Target,
  ChevronRight,
  Activity,
  Terminal,
  Sun,
  Moon,
  Lock,
} from 'lucide-react';

export default function OverviewPage() {
  const { user, isAuthenticated, isOfficer } = useAuth();
  const [activeTab, setActiveTab] = useState('productivity');
  const [frameTheme, setFrameTheme] = useState('light');

  return (
    <div className="w-full space-y-16 sm:space-y-24 pb-20">
      {/* 1. HERO SECTION (Matched to Once UI Reference) */}
      <section className="pt-8 sm:pt-14 pb-4 text-center relative max-w-4xl mx-auto space-y-6">
        {/* Dual-Segment Pill Badge */}
        <div className="flex justify-center">
          <div className="dual-badge-pill">
            <span className="font-bold">Skyline UI</span>
            <span className="dual-badge-divider"></span>
            <span className="font-medium text-brand-600 dark:text-brand-300">Campus Organization OS</span>
          </div>
        </div>

        {/* Hero Headline */}
        <h1 className="text-4xl sm:text-6xl md:text-7xl font-extrabold text-slate-900 dark:text-white tracking-[-0.035em] leading-[1.08] max-w-3xl mx-auto">
          Building bridges between students, campus, and community
        </h1>

        {/* Hero Subtitle */}
        <p className="text-base sm:text-lg md:text-xl text-slate-600 dark:text-slate-300 font-normal max-w-2xl mx-auto leading-relaxed">
          The unified student organization portal for Skyline College. Coordinate campus galas, join active project teams, track live ledger finances, and order club gear.
        </p>

        {/* Entity / Avatar Link Pill */}
        <div className="flex justify-center pt-2">
          <Link
            to="/members"
            className="avatar-link-pill group"
          >
            <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-brand-600 to-indigo-600 text-white flex items-center justify-center font-bold text-xs shadow-sm">
              S
            </div>
            <span className="text-sm font-semibold text-slate-900 dark:text-white group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors">
              About – Skyline Student Association
            </span>
            <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
          </Link>
        </div>
      </section>

      {/* 2. SHOWCASE STUDIO WINDOW (macOS Window Chrome with Once UI High-Fidelity Cards) */}
      <section className="max-w-6xl mx-auto px-1 sm:px-4">
        <div
          className={`p-5 sm:p-8 rounded-[28px] sm:rounded-[36px] relative overflow-hidden transition-all duration-300 ${
            frameTheme === 'light'
              ? 'bg-white/95 backdrop-blur-2xl border border-slate-200/90 shadow-[0_20px_70px_-15px_rgba(15,23,42,0.08)]'
              : 'bg-[#0A0E1A] border border-white/10 shadow-[0_25px_80px_-20px_rgba(2,6,23,0.6)] text-white'
          }`}
        >
          {/* Subtle Ambient Glow */}
          <div
            className={`absolute top-0 left-1/2 -translate-x-1/2 w-96 h-40 blur-3xl pointer-events-none rounded-full transition-opacity duration-500 ${
              frameTheme === 'light' ? 'bg-sky-400/10' : 'bg-sky-500/15'
            }`}
          />

          {/* Window Chrome Titlebar (macOS Style) */}
          <div
            className={`flex items-center justify-between pb-4 mb-6 border-b transition-colors relative z-10 ${
              frameTheme === 'light' ? 'border-slate-100' : 'border-white/10'
            }`}
          >
            {/* macOS Traffic Light Window Buttons */}
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-[#FF5F56] border border-[#E0443E]/60 inline-block shadow-xs" />
              <span className="w-3 h-3 rounded-full bg-[#FFBD2E] border border-[#DEA123]/60 inline-block shadow-xs" />
              <span className="w-3 h-3 rounded-full bg-[#27C93F] border border-[#1AAB29]/60 inline-block shadow-xs" />
            </div>

            {/* Centered URL / Workspace Pill */}
            <div
              className={`hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-mono font-medium transition-colors ${
                frameTheme === 'light'
                  ? 'bg-slate-100/90 text-slate-600 border border-slate-200/80'
                  : 'bg-white/5 text-slate-300 border border-white/10'
              }`}
            >
              <Lock className="w-3 h-3 text-emerald-500" />
              <span>skyline.college/workspace/platform-squad</span>
            </div>

            {/* Right: Live Sync Pulse + Theme Switcher Pill */}
            <div className="flex items-center gap-2.5">
              <div
                className={`flex items-center gap-1.5 text-[11px] font-mono font-medium ${
                  frameTheme === 'light' ? 'text-slate-500' : 'text-slate-400'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="hidden xs:inline">Live 24ms</span>
              </div>

              {/* Theme Toggle Button */}
              <button
                type="button"
                onClick={() => setFrameTheme(frameTheme === 'light' ? 'dark' : 'light')}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold border transition-all ${
                  frameTheme === 'light'
                    ? 'bg-slate-100 text-[#0F172A] hover:bg-slate-200/80 border-slate-200 shadow-xs'
                    : 'bg-white/10 text-white hover:bg-white/15 border-white/15 shadow-xs'
                }`}
                title="Toggle Light Canvas / Dark Studio mode"
              >
                {frameTheme === 'light' ? (
                  <>
                    <Moon className="w-3 h-3 text-slate-600" />
                    <span>Dark Studio</span>
                  </>
                ) : (
                  <>
                    <Sun className="w-3 h-3 text-amber-400" />
                    <span>Light Canvas</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Sub-Header: Squad Identity & Interactive Tabs */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 relative z-10">
            <div className="flex items-center gap-3">
              <div
                className={`w-9 h-9 rounded-xl flex items-center justify-center transition-colors ${
                  frameTheme === 'light'
                    ? 'bg-sky-50 text-sky-600 border border-sky-100'
                    : 'bg-sky-500/20 text-sky-400 border border-sky-400/30'
                }`}
              >
                <Activity className="w-4.5 h-4.5" />
              </div>
              <div>
                <h3
                  className={`text-sm font-bold flex items-center gap-2 ${
                    frameTheme === 'light' ? 'text-[#0F172A]' : 'text-white'
                  }`}
                >
                  <span>Platform Squad</span>
                  <span
                    className={`text-[11px] font-normal font-mono ${
                      frameTheme === 'light' ? 'text-slate-500' : 'text-slate-400'
                    }`}
                  >
                    • 38 tasks active
                  </span>
                </h3>
                <span className={`text-xs ${frameTheme === 'light' ? 'text-slate-500' : 'text-slate-400'}`}>
                  Live Production Workspace
                </span>
              </div>
            </div>

            {/* Segmented Controller */}
            <div
              className={`inline-flex p-1 rounded-full border self-start sm:self-auto transition-colors ${
                frameTheme === 'light'
                  ? 'bg-slate-100/90 border-slate-200'
                  : 'bg-white/5 border-white/10'
              }`}
            >
              <button
                type="button"
                onClick={() => setActiveTab('productivity')}
                className={`px-3.5 py-1 rounded-full text-xs font-semibold transition-all ${
                  activeTab === 'productivity'
                    ? frameTheme === 'light'
                      ? 'bg-white text-[#0F172A] shadow-sm font-bold'
                      : 'bg-white text-slate-900 shadow-sm font-bold'
                    : frameTheme === 'light'
                      ? 'text-slate-600 hover:text-[#0F172A]'
                      : 'text-slate-400 hover:text-white'
                }`}
              >
                Productivity
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('events')}
                className={`px-3.5 py-1 rounded-full text-xs font-semibold transition-all ${
                  activeTab === 'events'
                    ? frameTheme === 'light'
                      ? 'bg-white text-[#0F172A] shadow-sm font-bold'
                      : 'bg-white text-slate-900 shadow-sm font-bold'
                    : frameTheme === 'light'
                      ? 'text-slate-600 hover:text-[#0F172A]'
                      : 'text-slate-400 hover:text-white'
                }`}
              >
                Events & Gala
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('finance')}
                className={`px-3.5 py-1 rounded-full text-xs font-semibold transition-all ${
                  activeTab === 'finance'
                    ? frameTheme === 'light'
                      ? 'bg-white text-[#0F172A] shadow-sm font-bold'
                      : 'bg-white text-slate-900 shadow-sm font-bold'
                    : frameTheme === 'light'
                      ? 'text-slate-600 hover:text-[#0F172A]'
                      : 'text-slate-400 hover:text-white'
                }`}
              >
                Ledger
              </button>
            </div>
          </div>

          {/* Tab 1: Productivity & Tasks Kanban Preview */}
          {activeTab === 'productivity' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 relative z-10 animate-fade-in">
              {/* Column 1: To Do */}
              <div
                className={`rounded-2xl p-4 space-y-3.5 transition-colors ${
                  frameTheme === 'light'
                    ? 'bg-slate-50/90 border border-slate-200/80'
                    : 'bg-white/[0.03] border border-white/[0.08]'
                }`}
              >
                <div
                  className={`flex items-center justify-between text-xs font-semibold uppercase tracking-wider pb-2.5 border-b transition-colors ${
                    frameTheme === 'light'
                      ? 'text-slate-600 border-slate-200/80'
                      : 'text-slate-400 border-white/[0.06]'
                  }`}
                >
                  <span
                    className={`flex items-center gap-1.5 font-bold ${
                      frameTheme === 'light' ? 'text-[#0F172A]' : 'text-slate-300'
                    }`}
                  >
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-400" /> To Do
                  </span>
                  <span
                    className={`font-mono text-[11px] font-bold px-2 py-0.5 rounded-full ${
                      frameTheme === 'light'
                        ? 'bg-white text-slate-700 border border-slate-200'
                        : 'bg-white/10 text-white'
                    }`}
                  >
                    3
                  </span>
                </div>

                {/* Card 1: Frontend */}
                <div
                  className={`p-4 rounded-xl space-y-2.5 transition-all ${
                    frameTheme === 'light'
                      ? 'bg-white border border-slate-200/90 shadow-sm hover:border-sky-300 hover:shadow-md'
                      : 'bg-white/[0.04] border border-white/[0.08] hover:border-sky-500/40 hover:bg-white/[0.06]'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-sky-500/15 text-sky-600 border border-sky-400/20 uppercase tracking-wider">
                      Frontend
                    </span>
                    <span className="text-[10px] font-semibold text-rose-500 bg-rose-500/10 px-2 py-0.5 rounded-md border border-rose-500/20">
                      High
                    </span>
                  </div>
                  <h4
                    className={`text-xs font-bold leading-snug ${
                      frameTheme === 'light' ? 'text-[#0F172A]' : 'text-white'
                    }`}
                  >
                    Design Once UI Theme Alignment
                  </h4>
                  <p
                    className={`text-[11px] leading-relaxed ${
                      frameTheme === 'light' ? 'text-[#475569]' : 'text-slate-400'
                    }`}
                  >
                    Convert navigation and card tokens to modern minimalist SaaS aesthetic.
                  </p>
                  <div className="pt-2 flex items-center justify-between border-t border-slate-100 text-[11px]">
                    <div className="flex items-center gap-1.5">
                      <div className="w-5 h-5 rounded-full bg-sky-100 text-sky-700 font-bold text-[9px] flex items-center justify-center">
                        YG
                      </div>
                      <span className={frameTheme === 'light' ? 'text-slate-600' : 'text-slate-400'}>
                        Yaman G.
                      </span>
                    </div>
                    <span className="font-mono text-[10px] text-slate-400">2/3 Done</span>
                  </div>
                </div>

                {/* Card 2: Logistics */}
                <div
                  className={`p-4 rounded-xl space-y-2.5 transition-all ${
                    frameTheme === 'light'
                      ? 'bg-white border border-slate-200/90 shadow-sm hover:border-sky-300 hover:shadow-md'
                      : 'bg-white/[0.04] border border-white/[0.08] hover:border-sky-500/40 hover:bg-white/[0.06]'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-600 border border-emerald-400/20 uppercase tracking-wider">
                      Logistics
                    </span>
                    <span className="text-[10px] font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                      Normal
                    </span>
                  </div>
                  <h4
                    className={`text-xs font-bold leading-snug ${
                      frameTheme === 'light' ? 'text-[#0F172A]' : 'text-white'
                    }`}
                  >
                    Spring Gala Catering Selection
                  </h4>
                  <p
                    className={`text-[11px] leading-relaxed ${
                      frameTheme === 'light' ? 'text-[#475569]' : 'text-slate-400'
                    }`}
                  >
                    Verify banquet menus and vegetarian options for 100 ticket holders.
                  </p>
                  <div className="pt-2 flex items-center justify-between border-t border-slate-100 text-[11px]">
                    <div className="flex items-center gap-1.5">
                      <div className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 font-bold text-[9px] flex items-center justify-center">
                        SY
                      </div>
                      <span className={frameTheme === 'light' ? 'text-slate-600' : 'text-slate-400'}>
                        Selene Y.
                      </span>
                    </div>
                    <span className="font-mono text-[10px] text-slate-400">Due Oct 18</span>
                  </div>
                </div>
              </div>

              {/* Column 2: In Progress */}
              <div
                className={`rounded-2xl p-4 space-y-3.5 transition-colors ${
                  frameTheme === 'light'
                    ? 'bg-slate-50/90 border border-slate-200/80'
                    : 'bg-white/[0.03] border border-white/[0.08]'
                }`}
              >
                <div
                  className={`flex items-center justify-between text-xs font-semibold uppercase tracking-wider pb-2.5 border-b transition-colors ${
                    frameTheme === 'light'
                      ? 'text-slate-600 border-slate-200/80'
                      : 'text-slate-400 border-white/[0.06]'
                  }`}
                >
                  <span
                    className={`flex items-center gap-1.5 font-bold ${
                      frameTheme === 'light' ? 'text-[#0F172A]' : 'text-slate-300'
                    }`}
                  >
                    <span className="w-2.5 h-2.5 rounded-full bg-sky-500 animate-pulse" /> In Progress
                  </span>
                  <span
                    className={`font-mono text-[11px] font-bold px-2 py-0.5 rounded-full ${
                      frameTheme === 'light'
                        ? 'bg-white text-slate-700 border border-slate-200'
                        : 'bg-white/10 text-white'
                    }`}
                  >
                    2
                  </span>
                </div>

                {/* Card 1: Backend */}
                <div
                  className={`p-4 rounded-xl space-y-2.5 transition-all ${
                    frameTheme === 'light'
                      ? 'bg-white border border-slate-200/90 shadow-sm hover:border-sky-300 hover:shadow-md'
                      : 'bg-white/[0.04] border border-white/[0.08] hover:border-sky-500/40 hover:bg-white/[0.06]'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-indigo-500/15 text-indigo-600 border border-indigo-400/20 uppercase tracking-wider">
                      Backend
                    </span>
                    <span className="text-[10px] font-bold text-red-600 bg-red-500/15 px-2 py-0.5 rounded-md border border-red-500/30 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" /> Critical
                    </span>
                  </div>
                  <h4
                    className={`text-xs font-bold leading-snug ${
                      frameTheme === 'light' ? 'text-[#0F172A]' : 'text-white'
                    }`}
                  >
                    QR Code Dynamic Ticket Check-In
                  </h4>
                  <p
                    className={`text-[11px] leading-relaxed ${
                      frameTheme === 'light' ? 'text-[#475569]' : 'text-slate-400'
                    }`}
                  >
                    Atomic database verification preventing double check-in at venue door.
                  </p>
                  <div className="pt-2 flex items-center justify-between border-t border-slate-100 text-[11px]">
                    <div className="flex items-center gap-1.5">
                      <div className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 font-bold text-[9px] flex items-center justify-center">
                        AL
                      </div>
                      <span className={frameTheme === 'light' ? 'text-slate-600' : 'text-slate-400'}>
                        Alex L.
                      </span>
                    </div>
                    <span className="font-mono text-[10px] text-emerald-600 font-semibold">4/4 Tests Pass</span>
                  </div>
                </div>

                {/* Card 2: Store */}
                <div
                  className={`p-4 rounded-xl space-y-2.5 transition-all ${
                    frameTheme === 'light'
                      ? 'bg-white border border-slate-200/90 shadow-sm hover:border-sky-300 hover:shadow-md'
                      : 'bg-white/[0.04] border border-white/[0.08] hover:border-sky-500/40 hover:bg-white/[0.06]'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-500/15 text-amber-600 border border-amber-400/20 uppercase tracking-wider">
                      Store
                    </span>
                    <span className="text-[10px] font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                      Normal
                    </span>
                  </div>
                  <h4
                    className={`text-xs font-bold leading-snug ${
                      frameTheme === 'light' ? 'text-[#0F172A]' : 'text-white'
                    }`}
                  >
                    Merch Hoodies Inventory Seed
                  </h4>
                  <p
                    className={`text-[11px] leading-relaxed ${
                      frameTheme === 'light' ? 'text-[#475569]' : 'text-slate-400'
                    }`}
                  >
                    Per-size stock reservation with real-time depletion triggers.
                  </p>
                  <div className="pt-2 flex items-center justify-between border-t border-slate-100 text-[11px]">
                    <div className="flex items-center gap-1.5">
                      <div className="w-5 h-5 rounded-full bg-amber-100 text-amber-700 font-bold text-[9px] flex items-center justify-center">
                        JD
                      </div>
                      <span className={frameTheme === 'light' ? 'text-slate-600' : 'text-slate-400'}>
                        Jane D.
                      </span>
                    </div>
                    <span className="font-mono text-[10px] text-amber-600 font-semibold">84 units seeded</span>
                  </div>
                </div>
              </div>

              {/* Column 3: Completed */}
              <div
                className={`rounded-2xl p-4 space-y-3.5 transition-colors ${
                  frameTheme === 'light'
                    ? 'bg-slate-50/90 border border-slate-200/80'
                    : 'bg-white/[0.03] border border-white/[0.08]'
                }`}
              >
                <div
                  className={`flex items-center justify-between text-xs font-semibold uppercase tracking-wider pb-2.5 border-b transition-colors ${
                    frameTheme === 'light'
                      ? 'text-slate-600 border-slate-200/80'
                      : 'text-slate-400 border-white/[0.06]'
                  }`}
                >
                  <span
                    className={`flex items-center gap-1.5 font-bold ${
                      frameTheme === 'light' ? 'text-[#0F172A]' : 'text-slate-300'
                    }`}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> Completed
                  </span>
                  <span
                    className={`font-mono text-[11px] font-bold px-2 py-0.5 rounded-full ${
                      frameTheme === 'light'
                        ? 'bg-white text-slate-700 border border-slate-200'
                        : 'bg-white/10 text-white'
                    }`}
                  >
                    12
                  </span>
                </div>

                {/* Card 1: Completed Audit Card (Clean and verified, no strikethrough) */}
                <div
                  className={`p-4 rounded-xl space-y-2.5 transition-all ${
                    frameTheme === 'light'
                      ? 'bg-white border border-emerald-200/80 shadow-sm'
                      : 'bg-white/[0.04] border border-emerald-500/20'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-purple-500/15 text-purple-600 border border-purple-400/20 uppercase tracking-wider">
                      Audit
                    </span>
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-600 border border-emerald-400/30">
                      <CheckCircle2 className="w-3 h-3" /> Verified
                    </span>
                  </div>
                  <h4
                    className={`text-xs font-bold leading-snug ${
                      frameTheme === 'light' ? 'text-[#0F172A]' : 'text-white'
                    }`}
                  >
                    Cryptographic Ledger Double-Entry
                  </h4>
                  <p
                    className={`text-[11px] leading-relaxed ${
                      frameTheme === 'light' ? 'text-[#475569]' : 'text-slate-400'
                    }`}
                  >
                    159 unit & integration tests passing with 100% verified math integrity.
                  </p>
                  <div className="pt-2 flex items-center justify-between border-t border-slate-100 text-[11px]">
                    <span className="text-slate-500 text-[10px]">Zero discrepancies</span>
                    <span className="font-mono text-[10px] text-emerald-600 font-semibold">100% Passing</span>
                  </div>
                </div>

                {/* Open Full Kanban Board Button */}
                <Link
                  to="/tasks"
                  className="block text-center py-2.5 rounded-full text-xs font-bold transition-all shadow-md shadow-brand-500/20 bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 text-white"
                >
                  Open Full Kanban Board &rarr;
                </Link>
              </div>
            </div>
          )}

          {/* Tab 2: Events & Gala Preview */}
          {activeTab === 'events' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 relative z-10 animate-fade-in">
              <div
                className={`p-5 rounded-2xl space-y-3 transition-colors ${
                  frameTheme === 'light'
                    ? 'bg-slate-50/80 border border-slate-200/80'
                    : 'bg-white/[0.04] border border-white/10'
                }`}
              >
                <Badge variant="primary" size="sm">
                  Upcoming Flagship
                </Badge>
                <h4 className={`text-base font-bold ${frameTheme === 'light' ? 'text-[#0F172A]' : 'text-white'}`}>
                  Annual Spring Leadership Gala
                </h4>
                <p className={`text-xs leading-relaxed ${frameTheme === 'light' ? 'text-[#475569]' : 'text-slate-400'}`}>
                  Skyline Grand Ballroom • Oct 24, 2026. Keynotes, dinner, and networking.
                </p>
                <div className="pt-2 flex items-center justify-between text-xs">
                  <span className={frameTheme === 'light' ? 'text-slate-500' : 'text-slate-400'}>
                    Tickets Available:
                  </span>
                  <span className="font-bold text-emerald-600 font-mono">42 / 100 Seats</span>
                </div>
                <Link to="/events" className="block pt-2">
                  <Button
                    variant="primary"
                    size="sm"
                    className="w-full font-bold shadow-sm"
                  >
                    Reserve Ticket ($15.00)
                  </Button>
                </Link>
              </div>

              <div
                className={`p-5 rounded-2xl space-y-3 transition-colors ${
                  frameTheme === 'light'
                    ? 'bg-slate-50/80 border border-slate-200/80'
                    : 'bg-white/[0.04] border border-white/10'
                }`}
              >
                <Badge variant="neutral" size="sm" className={frameTheme === 'light' ? 'bg-slate-100 text-slate-700 border-slate-200' : 'bg-white/10 text-slate-300 border-white/10'}>
                  Workshop
                </Badge>
                <h4 className={`text-base font-bold ${frameTheme === 'light' ? 'text-[#0F172A]' : 'text-white'}`}>
                  Full-Stack Agentic Web Hackathon
                </h4>
                <p className={`text-xs leading-relaxed ${frameTheme === 'light' ? 'text-[#475569]' : 'text-slate-400'}`}>
                  Engineering Lab Rm 104 • Nov 12, 2026. Build collaborative AI apps with mentors.
                </p>
                <div className="pt-2 flex items-center justify-between text-xs">
                  <span className={frameTheme === 'light' ? 'text-slate-500' : 'text-slate-400'}>
                    Registration:
                  </span>
                  <span className="font-bold text-brand-600 dark:text-brand-400">Free for Members</span>
                </div>
                <Link to="/events" className="block pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className={`w-full ${
                      frameTheme === 'light'
                        ? 'border-slate-300 text-[#0F172A] hover:bg-slate-100'
                        : 'border-white/20 text-white hover:bg-white/10'
                    }`}
                  >
                    View Details
                  </Button>
                </Link>
              </div>

              <div
                className={`p-5 rounded-2xl space-y-3 flex flex-col justify-between transition-colors ${
                  frameTheme === 'light'
                    ? 'bg-slate-50/80 border border-slate-200/80'
                    : 'bg-white/[0.04] border border-white/10'
                }`}
              >
                <div>
                  <Badge variant="neutral" size="sm" className={frameTheme === 'light' ? 'bg-slate-100 text-slate-700 border-slate-200' : 'bg-white/10 text-slate-300 border-white/10'}>
                    Door Scanner
                  </Badge>
                  <h4 className={`text-base font-bold mt-2 ${frameTheme === 'light' ? 'text-[#0F172A]' : 'text-white'}`}>
                    Officer Fast Check-In
                  </h4>
                  <p className={`text-xs leading-relaxed mt-1 ${frameTheme === 'light' ? 'text-[#475569]' : 'text-slate-400'}`}>
                    Scan attendee QR code passes at entrance with zero latency on mobile.
                  </p>
                </div>
                <Link to="/events/check-in" className="pt-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    className="w-full font-semibold"
                  >
                    <QrCode className="w-3.5 h-3.5 mr-1.5" /> Launch QR Scanner
                  </Button>
                </Link>
              </div>
            </div>
          )}

          {/* Tab 3: Finance Ledger Preview */}
          {activeTab === 'finance' && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 relative z-10 animate-fade-in">
              <div
                className={`p-5 rounded-2xl transition-colors ${
                  frameTheme === 'light'
                    ? 'bg-slate-50/80 border border-slate-200/80'
                    : 'bg-white/[0.04] border border-white/10'
                }`}
              >
                <span className={`text-xs uppercase font-semibold ${frameTheme === 'light' ? 'text-slate-500' : 'text-slate-400'}`}>
                  Treasury Balance
                </span>
                <div className="text-3xl font-black text-emerald-600 mt-2 font-mono">
                  $14,850.00
                </div>
                <p className={`text-xs mt-1 ${frameTheme === 'light' ? 'text-slate-500' : 'text-slate-400'}`}>
                  Verified double-entry ledger
                </p>
              </div>

              <div
                className={`p-5 rounded-2xl transition-colors ${
                  frameTheme === 'light'
                    ? 'bg-slate-50/80 border border-slate-200/80'
                    : 'bg-white/[0.04] border border-white/10'
                }`}
              >
                <span className={`text-xs uppercase font-semibold ${frameTheme === 'light' ? 'text-slate-500' : 'text-slate-400'}`}>
                  Active Fundraisers
                </span>
                <div className="text-3xl font-black text-brand-600 dark:text-brand-400 mt-2 font-mono">
                  $3,200.00
                </div>
                <p className={`text-xs mt-1 ${frameTheme === 'light' ? 'text-slate-500' : 'text-slate-400'}`}>
                  80% of $4,000 gala budget goal
                </p>
              </div>

              <div
                className={`p-5 rounded-2xl flex flex-col justify-between transition-colors ${
                  frameTheme === 'light'
                    ? 'bg-slate-50/80 border border-slate-200/80'
                    : 'bg-white/[0.04] border border-white/10'
                }`}
              >
                <div>
                  <span className={`text-xs uppercase font-semibold ${frameTheme === 'light' ? 'text-slate-500' : 'text-slate-400'}`}>
                    Member Reimbursements
                  </span>
                  <div className={`text-xl font-bold mt-1 ${frameTheme === 'light' ? 'text-[#0F172A]' : 'text-white'}`}>
                    Instant Direct Ledger
                  </div>
                </div>
                <Link to="/finance/reimbursements" className="pt-3">
                  <Button
                    variant="primary"
                    size="sm"
                    className="w-full font-bold shadow-sm"
                  >
                    File Claim
                  </Button>
                </Link>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* 3. FOUR CORE MODULE PILLARS (Clean Minimalist Cards) */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="text-center max-w-xl mx-auto mb-12 space-y-2">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-[#0F172A] tracking-tight">
            Designed for seamless campus governance
          </h2>
          <p className="text-sm text-[#64748B]">
            Four core engines working together in one unified student organization system.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {/* Pillar 1: Events */}
          <Link
            to="/events"
            className="group p-6 rounded-3xl glass-panel border-white/40 dark:border-slate-800/80 shadow-lg hover:shadow-2xl hover:border-brand-500/30 transition-all flex flex-col justify-between"
          >
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-2xl bg-brand-50 dark:bg-brand-950/50 text-brand-600 dark:text-brand-400 flex items-center justify-center font-bold">
                <Calendar className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors">
                Events & Ticketing
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Live seat availability, member discount pricing, and dynamic QR door check-in.
              </p>
            </div>
            <div className="pt-4 flex items-center text-xs font-semibold text-brand-600 dark:text-brand-400 group-hover:translate-x-0.5 transition-transform">
              <span>Browse Galas</span>
              <ArrowRight className="w-3.5 h-3.5 ml-1" />
            </div>
          </Link>

          {/* Pillar 2: Finance */}
          <Link
            to="/finance"
            className="group p-6 rounded-3xl glass-panel border-white/40 dark:border-slate-800/80 shadow-lg hover:shadow-2xl hover:border-emerald-500/30 transition-all flex flex-col justify-between"
          >
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
                <DollarSign className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                Treasury Ledger
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Immutable double-entry book-keeping with officer receipt approvals.
              </p>
            </div>
            <div className="pt-4 flex items-center text-xs font-semibold text-emerald-600 dark:text-emerald-400 group-hover:translate-x-0.5 transition-transform">
              <span>View Financials</span>
              <ArrowRight className="w-3.5 h-3.5 ml-1" />
            </div>
          </Link>

          {/* Pillar 3: Members */}
          <Link
            to="/members"
            className="group p-6 rounded-3xl glass-panel border-white/40 dark:border-slate-800/80 shadow-lg hover:shadow-2xl hover:border-brand-500/30 transition-all flex flex-col justify-between"
          >
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-2xl bg-brand-50 dark:bg-brand-950/50 text-brand-600 dark:text-brand-400 flex items-center justify-center font-bold">
                <Users className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors">
                Membership Passes
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Tiered membership benefits, 15% merch discounts, and cryptographic digital IDs.
              </p>
            </div>
            <div className="pt-4 flex items-center text-xs font-semibold text-brand-600 dark:text-brand-400 group-hover:translate-x-0.5 transition-transform">
              <span>Join or Verify</span>
              <ArrowRight className="w-3.5 h-3.5 ml-1" />
            </div>
          </Link>

          {/* Pillar 4: Merch Store */}
          <Link
            to="/store"
            className="group p-6 rounded-3xl glass-panel border-white/40 dark:border-slate-800/80 shadow-lg hover:shadow-2xl hover:border-brand-500/30 transition-all flex flex-col justify-between"
          >
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-2xl bg-brand-50 dark:bg-brand-950/50 text-brand-600 dark:text-brand-400 flex items-center justify-center font-bold">
                <ShoppingBag className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors">
                Merchandise Store
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Official hoodies, shirts and stickers with per-size inventory tracking.
              </p>
            </div>
            <div className="pt-4 flex items-center text-xs font-semibold text-brand-600 dark:text-brand-400 group-hover:translate-x-0.5 transition-transform">
              <span>Explore Merch</span>
              <ArrowRight className="w-3.5 h-3.5 ml-1" />
            </div>
          </Link>
        </div>
      </section>

      {/* 4. CALL TO ACTION WELL */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 text-center">
        <div className="p-8 sm:p-12 rounded-3xl bg-white border border-slate-200 shadow-md space-y-4">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-[#0F172A] tracking-tight">
            Ready to participate in campus life?
          </h2>
          <p className="text-sm text-[#64748B] max-w-lg mx-auto">
            Create your member account in less than 30 seconds to join committees, unlock event discounts, and connect with fellow students.
          </p>
          <div className="pt-2 flex flex-wrap justify-center gap-3">
            <Link to="/register">
              <Button variant="primary" size="lg" className="rounded-full font-bold px-7 shadow-md">
                Get Started Today
              </Button>
            </Link>
            <Link to="/events">
              <Button variant="secondary" size="lg" className="rounded-full px-7">
                View Upcoming Events
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
