import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  BarChart3,
  TrendingUp,
  DollarSign,
  Users,
  Calendar,
  CheckCircle2,
  XCircle,
  Clock,
  Printer,
  ShieldCheck,
  ShieldAlert,
  ArrowLeft,
  RefreshCw,
  Sparkles,
  ExternalLink,
  ChevronRight,
  PieChart,
  UserCheck,
  UserX,
  Ticket,
} from 'lucide-react';
import { useAuth } from '../../lib/AuthContext';
import { fetchEvents, fetchEventStats } from './eventsApi';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';

export default function EventStatsPage() {
  const { id: urlEventId } = useParams();
  const navigate = useNavigate();
  const { isOfficer, isAuthenticated, user } = useAuth();

  const [selectedEventId, setSelectedEventId] = useState(urlEventId || '');

  // Fetch all events for the selector dropdown
  const { data: events = [] } = useQuery({
    queryKey: ['events', 'stats-list'],
    queryFn: () => fetchEvents(),
    enabled: isOfficer,
  });

  // Set default event if none specified in route
  useEffect(() => {
    if (urlEventId) {
      setSelectedEventId(urlEventId);
    } else if (!selectedEventId && events.length > 0) {
      setSelectedEventId(events[0].id.toString());
    }
  }, [urlEventId, events, selectedEventId]);

  // Fetch Event Stats from backend
  const {
    data: stats,
    isLoading: isStatsLoading,
    isError: isStatsError,
    error: statsError,
    refetch: refetchStats,
    isFetching: isStatsFetching,
  } = useQuery({
    queryKey: ['event-stats', selectedEventId],
    queryFn: () => fetchEventStats(selectedEventId),
    enabled: isOfficer && Boolean(selectedEventId),
    refetchInterval: 10000, // Background poll every 10s
  });

  // Print Summary Report for Treasurer / Dean
  const handlePrintReport = () => {
    window.print();
  };

  // Guard: Officers Only
  if (!isAuthenticated || !isOfficer) {
    return (
      <div className="max-w-xl mx-auto py-16 px-4 text-center space-y-6">
        <div className="w-20 h-20 rounded-3xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mx-auto text-amber-400">
          <ShieldAlert className="w-10 h-10" />
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-black text-white">Officer Analytics Access Required</h1>
          <p className="text-slate-400 text-sm leading-relaxed">
            Financial analytics, revenue reports, and attendance reconciliations are strictly restricted to club officers (Club Leaders & Admins).
          </p>
        </div>
        <div className="pt-4 flex justify-center gap-3">
          <Link to="/events">
            <Button variant="outline">Back to Events</Button>
          </Link>
          {!isAuthenticated && (
            <Link to="/login">
              <Button variant="primary">Log In as Officer</Button>
            </Link>
          )}
        </div>
      </div>
    );
  }

  // Attendance metrics math
  const ticketsSold = stats?.tickets_sold ?? 0;
  const attendance = stats?.attendance ?? 0;
  const attendanceRate = stats?.attendance_rate ?? 0;
  const noShows = Math.max(0, ticketsSold - attendance);
  const noShowRate = ticketsSold > 0 ? ((noShows / ticketsSold) * 100).toFixed(1) : 0;
  const capacity = stats?.capacity ?? 0;
  const capacityOccupancy = capacity > 0 ? Math.min(100, Math.round((ticketsSold / capacity) * 100)) : 0;

  // Revenue metrics math
  const totalRevenue = parseFloat(stats?.total_revenue ?? 0);
  const memberRevenue = parseFloat(stats?.member_revenue ?? 0);
  const nonmemberRevenue = parseFloat(stats?.nonmember_revenue ?? 0);
  const memberTickets = stats?.tickets_sold_breakdown?.member ?? 0;
  const nonmemberTickets = stats?.tickets_sold_breakdown?.nonmember ?? 0;

  const memberRevenueShare = totalRevenue > 0 ? Math.round((memberRevenue / totalRevenue) * 100) : 0;
  const nonmemberRevenueShare = totalRevenue > 0 ? 100 - memberRevenueShare : 0;

  const memberTicketShare = ticketsSold > 0 ? Math.round((memberTickets / ticketsSold) * 100) : 0;
  const nonmemberTicketShare = ticketsSold > 0 ? 100 - memberTicketShare : 0;

  const avgRevPerTicket = ticketsSold > 0 ? (totalRevenue / ticketsSold).toFixed(2) : '0.00';
  const avgRevPerAttendee = attendance > 0 ? (totalRevenue / attendance).toFixed(2) : '0.00';

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-20 print:p-0 print:m-0">
      {/* Top Header & Event Selector */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-800 print:hidden">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-brand-400 mb-1">
            <BarChart3 className="w-4 h-4" />
            <span>Post-Event Audit & Executive Analytics</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            Event Attendance & Financials
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Reconcile gate check-ins against ticket sales and verify ledger income after the gala.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Event Picker Dropdown */}
          <select
            value={selectedEventId}
            onChange={(e) => {
              setSelectedEventId(e.target.value);
              navigate(`/events/${e.target.value}/stats`);
            }}
            className="bg-surface-900 border border-slate-700 text-white text-xs rounded-xl px-3 py-2.5 focus:outline-none focus:border-brand-500 font-medium"
          >
            {events.map((evt) => (
              <option key={evt.id} value={evt.id}>
                {evt.title} ({evt.status})
              </option>
            ))}
          </select>

          <Button variant="outline" size="sm" onClick={() => refetchStats()} className="text-xs">
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${isStatsFetching ? 'animate-spin' : ''}`} />
            Refresh
          </Button>

          <Button variant="primary" size="sm" onClick={handlePrintReport} className="text-xs">
            <Printer className="w-3.5 h-3.5 mr-1.5" />
            Print Gala Report
          </Button>
        </div>
      </div>

      {/* Printable Report Header (Visible only when printing) */}
      <div className="hidden print:block mb-8 border-b pb-4">
        <h1 className="text-2xl font-bold">Skyline Student Association - Event Audit Report</h1>
        <h2 className="text-lg font-semibold mt-1">{stats?.event_title}</h2>
        <p className="text-xs text-gray-600">
          Generated on {new Date().toLocaleDateString()} by Officer {user?.name || user?.username}
        </p>
      </div>

      {isStatsLoading ? (
        <div className="py-20 text-center space-y-3">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto text-brand-400" />
          <p className="text-sm text-slate-400">Loading audit statistics from tickets ledger...</p>
        </div>
      ) : isStatsError ? (
        <div className="p-6 rounded-2xl bg-rose-950/60 border border-rose-800 text-rose-200 text-center space-y-2">
          <p className="text-sm font-bold">Failed to load statistics for this event.</p>
          <p className="text-xs text-rose-300/80">
            {statsError?.response?.data?.detail || statsError?.message}
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Quick Context Strip */}
          <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-2xl bg-surface-900/80 border border-slate-800 text-xs">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-brand-500/10 border border-brand-500/20 flex items-center justify-center text-brand-400">
                <Ticket className="w-4 h-4" />
              </div>
              <div>
                <span className="text-slate-400 block">Audited Event</span>
                <span className="font-bold text-white text-sm">{stats?.event_title}</span>
              </div>
            </div>

            <div className="flex items-center gap-2 print:hidden">
              <Link to={`/events/${selectedEventId}/checkin`}>
                <Button variant="outline" size="sm" className="text-xs h-8">
                  Gate Scanner
                </Button>
              </Link>
              <Link to={`/events/${selectedEventId}/edit`}>
                <Button variant="outline" size="sm" className="text-xs h-8">
                  Edit Event
                </Button>
              </Link>
              <Link to={`/events/${selectedEventId}`}>
                <Button variant="outline" size="sm" className="text-xs h-8">
                  Public Page
                </Button>
              </Link>
            </div>
          </div>

          {/* SECTION 1: ATTENDANCE RECONCILIATION */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-emerald-400" />
              <h2 className="text-lg font-black text-white tracking-tight">
                Attendance & Gate Turnout Reconciliation
              </h2>
            </div>

            {/* Attendance KPI Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Admitted Count */}
              <Card className="bg-surface-900/90 border-slate-800 shadow-lg">
                <CardContent className="p-5 flex items-center justify-between">
                  <div>
                    <span className="text-xs text-slate-400 font-medium uppercase tracking-wider block">
                      Actual Attendance
                    </span>
                    <div className="flex items-baseline gap-2 mt-1">
                      <span className="text-3xl font-black text-emerald-400">{attendance}</span>
                      <span className="text-xs text-slate-500">checked in</span>
                    </div>
                  </div>
                  <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                    <UserCheck className="w-6 h-6" />
                  </div>
                </CardContent>
              </Card>

              {/* Turnout Rate */}
              <Card className="bg-surface-900/90 border-slate-800 shadow-lg">
                <CardContent className="p-5 flex items-center justify-between">
                  <div>
                    <span className="text-xs text-slate-400 font-medium uppercase tracking-wider block">
                      Turnout Rate
                    </span>
                    <div className="flex items-baseline gap-2 mt-1">
                      <span className="text-3xl font-black text-brand-400">{attendanceRate}%</span>
                      <span className="text-xs text-slate-500">of ticket holders</span>
                    </div>
                  </div>
                  <div className="w-12 h-12 rounded-2xl bg-brand-500/10 border border-brand-500/20 flex items-center justify-center text-brand-400">
                    <TrendingUp className="w-6 h-6" />
                  </div>
                </CardContent>
              </Card>

              {/* Total Tickets Sold */}
              <Card className="bg-surface-900/90 border-slate-800 shadow-lg">
                <CardContent className="p-5 flex items-center justify-between">
                  <div>
                    <span className="text-xs text-slate-400 font-medium uppercase tracking-wider block">
                      Tickets Sold
                    </span>
                    <div className="flex items-baseline gap-2 mt-1">
                      <span className="text-3xl font-black text-white">{ticketsSold}</span>
                      <span className="text-xs text-slate-500">/ {capacity} capacity</span>
                    </div>
                  </div>
                  <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-white">
                    <Ticket className="w-6 h-6" />
                  </div>
                </CardContent>
              </Card>

              {/* Absent / No-Shows */}
              <Card className="bg-surface-900/90 border-slate-800 shadow-lg">
                <CardContent className="p-5 flex items-center justify-between">
                  <div>
                    <span className="text-xs text-slate-400 font-medium uppercase tracking-wider block">
                      No-Shows
                    </span>
                    <div className="flex items-baseline gap-2 mt-1">
                      <span className="text-3xl font-black text-amber-400">{noShows}</span>
                      <span className="text-xs text-slate-500">({noShowRate}%)</span>
                    </div>
                  </div>
                  <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                    <UserX className="w-6 h-6" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Visual Attendance Progress Breakdown */}
            <Card className="bg-surface-900/90 border-slate-800 p-6 space-y-6">
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-white">Attendance Turnout vs No-Shows</span>
                  <span className="text-slate-400">
                    {attendance} Admitted ({attendanceRate}%) • {noShows} Absent ({noShowRate}%)
                  </span>
                </div>
                {/* Segmented Bar */}
                <div className="w-full h-4 bg-surface-950 rounded-full overflow-hidden flex border border-slate-800">
                  <div
                    className="bg-emerald-500 h-full transition-all duration-700"
                    style={{ width: `${attendanceRate}%` }}
                    title={`Admitted: ${attendance}`}
                  />
                  <div
                    className="bg-amber-500/70 h-full transition-all duration-700"
                    style={{ width: `${noShowRate}%` }}
                    title={`Absent: ${noShows}`}
                  />
                </div>
                <div className="flex justify-between text-[11px] text-slate-500">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
                    Admitted at Gate: {attendance}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500/70 inline-block" />
                    Did Not Attend (No-Show): {noShows}
                  </span>
                </div>
              </div>

              {/* Ticket Holder Demographics (Member vs Non-Member Attendance) */}
              <div className="pt-4 border-t border-slate-800 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-white">Attendee Demographics</span>
                  <span className="text-slate-400">
                    {memberTickets} Members ({memberTicketShare}%) • {nonmemberTickets} Non-Members ({nonmemberTicketShare}%)
                  </span>
                </div>
                <div className="w-full h-3 bg-surface-950 rounded-full overflow-hidden flex border border-slate-800">
                  <div
                    className="bg-brand-500 h-full transition-all duration-700"
                    style={{ width: `${memberTicketShare}%` }}
                  />
                  <div
                    className="bg-accent-500 h-full transition-all duration-700"
                    style={{ width: `${nonmemberTicketShare}%` }}
                  />
                </div>
                <div className="flex justify-between text-[11px] text-slate-500">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-brand-500 inline-block" />
                    Club Members: {memberTickets} tickets
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-accent-500 inline-block" />
                    General Admission: {nonmemberTickets} tickets
                  </span>
                </div>
              </div>
            </Card>
          </div>

          {/* SECTION 2: FINANCIAL REVENUE RECONCILIATION */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-emerald-400" />
              <h2 className="text-lg font-black text-white tracking-tight">
                Financial Revenue Reconciliation
              </h2>
            </div>

            {/* Revenue KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Total Revenue */}
              <Card className="bg-surface-900/90 border-slate-800 shadow-lg">
                <CardContent className="p-5 flex items-center justify-between">
                  <div>
                    <span className="text-xs text-slate-400 font-medium uppercase tracking-wider block">
                      Total Ticket Income
                    </span>
                    <div className="flex items-baseline gap-1 mt-1">
                      <span className="text-3xl font-black text-emerald-400">
                        ${totalRevenue.toFixed(2)}
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-500 block mt-0.5">
                      Recorded in club ledger
                    </span>
                  </div>
                  <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                    <DollarSign className="w-6 h-6" />
                  </div>
                </CardContent>
              </Card>

              {/* Member Revenue */}
              <Card className="bg-surface-900/90 border-slate-800 shadow-lg">
                <CardContent className="p-5 flex items-center justify-between">
                  <div>
                    <span className="text-xs text-slate-400 font-medium uppercase tracking-wider block">
                      Member Revenue
                    </span>
                    <div className="flex items-baseline gap-1 mt-1">
                      <span className="text-3xl font-black text-brand-400">
                        ${memberRevenue.toFixed(2)}
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-500 block mt-0.5">
                      {memberTickets} tickets ({memberRevenueShare}%)
                    </span>
                  </div>
                  <div className="w-12 h-12 rounded-2xl bg-brand-500/10 border border-brand-500/20 flex items-center justify-center text-brand-400">
                    <Sparkles className="w-6 h-6" />
                  </div>
                </CardContent>
              </Card>

              {/* Non-Member Revenue */}
              <Card className="bg-surface-900/90 border-slate-800 shadow-lg">
                <CardContent className="p-5 flex items-center justify-between">
                  <div>
                    <span className="text-xs text-slate-400 font-medium uppercase tracking-wider block">
                      Non-Member Revenue
                    </span>
                    <div className="flex items-baseline gap-1 mt-1">
                      <span className="text-3xl font-black text-accent-400">
                        ${nonmemberRevenue.toFixed(2)}
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-500 block mt-0.5">
                      {nonmemberTickets} tickets ({nonmemberRevenueShare}%)
                    </span>
                  </div>
                  <div className="w-12 h-12 rounded-2xl bg-accent-500/10 border border-accent-500/20 flex items-center justify-center text-accent-400">
                    <Users className="w-6 h-6" />
                  </div>
                </CardContent>
              </Card>

              {/* Average Yield per Attendee */}
              <Card className="bg-surface-900/90 border-slate-800 shadow-lg">
                <CardContent className="p-5 flex items-center justify-between">
                  <div>
                    <span className="text-xs text-slate-400 font-medium uppercase tracking-wider block">
                      Yield Per Attendee
                    </span>
                    <div className="flex items-baseline gap-1 mt-1">
                      <span className="text-3xl font-black text-white">
                        ${avgRevPerAttendee}
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-500 block mt-0.5">
                      Avg across admitted guests
                    </span>
                  </div>
                  <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-white">
                    <TrendingUp className="w-6 h-6" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Visual Revenue Breakdown Bar */}
            <Card className="bg-surface-900/90 border-slate-800 p-6 space-y-4">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-white">Revenue Stream Contribution</span>
                <span className="text-slate-400">
                  Total Income: ${totalRevenue.toFixed(2)}
                </span>
              </div>

              {/* Proportional Segmented Revenue Bar */}
              <div className="w-full h-6 bg-surface-950 rounded-xl overflow-hidden flex border border-slate-800 shadow-inner">
                {memberRevenue > 0 && (
                  <div
                    className="bg-gradient-to-r from-brand-600 to-brand-500 h-full flex items-center justify-center text-[10px] font-bold text-white transition-all duration-700"
                    style={{ width: `${memberRevenueShare}%` }}
                    title={`Member: $${memberRevenue.toFixed(2)} (${memberRevenueShare}%)`}
                  >
                    {memberRevenueShare > 15 && `Members (${memberRevenueShare}%)`}
                  </div>
                )}
                {nonmemberRevenue > 0 && (
                  <div
                    className="bg-gradient-to-r from-accent-600 to-accent-500 h-full flex items-center justify-center text-[10px] font-bold text-white transition-all duration-700"
                    style={{ width: `${nonmemberRevenueShare}%` }}
                    title={`Non-Member: $${nonmemberRevenue.toFixed(2)} (${nonmemberRevenueShare}%)`}
                  >
                    {nonmemberRevenueShare > 15 && `General (${nonmemberRevenueShare}%)`}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4 pt-2 text-xs">
                <div className="p-3 rounded-xl bg-surface-950/70 border border-slate-800 space-y-1">
                  <div className="flex items-center gap-1.5 text-brand-400 font-semibold">
                    <span className="w-2 h-2 rounded-full bg-brand-400" />
                    <span>Member Tier Sales</span>
                  </div>
                  <p className="text-white font-black text-base">${memberRevenue.toFixed(2)}</p>
                  <p className="text-[11px] text-slate-500">
                    {memberTickets} tickets sold at discounted club member rates
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-surface-950/70 border border-slate-800 space-y-1">
                  <div className="flex items-center gap-1.5 text-accent-400 font-semibold">
                    <span className="w-2 h-2 rounded-full bg-accent-400" />
                    <span>General Admission Sales</span>
                  </div>
                  <p className="text-white font-black text-base">${nonmemberRevenue.toFixed(2)}</p>
                  <p className="text-[11px] text-slate-500">
                    {nonmemberTickets} tickets sold at standard public rates
                  </p>
                </div>
              </div>
            </Card>
          </div>

          {/* SECTION 3: POST-GALA OFFICER AUDIT CHECKLIST */}
          <Card className="bg-surface-900/60 border-slate-800 p-6 space-y-4">
            <h3 className="font-bold text-white text-sm flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              Post-Gala Reconciliation Workflow & Single Source of Truth
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-slate-300">
              <div className="p-3.5 rounded-xl bg-surface-950 border border-slate-800 space-y-1.5">
                <span className="font-bold text-emerald-400 block">1. Door vs Ticket Audit</span>
                <p className="text-slate-400 text-[11px] leading-relaxed">
                  Compare total {attendance} scanned QR admissions against {ticketsSold} paid tickets. {noShows} guests did not attend.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-surface-950 border border-slate-800 space-y-1.5">
                <span className="font-bold text-brand-400 block">2. Core Ledger Income</span>
                <p className="text-slate-400 text-[11px] leading-relaxed">
                  All ${totalRevenue.toFixed(2)} was automatically recorded under category <code>'ticket'</code> in the central finance ledger.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-surface-950 border border-slate-800 space-y-1.5">
                <span className="font-bold text-accent-400 block">3. Executive Reporting</span>
                <p className="text-slate-400 text-[11px] leading-relaxed">
                  Click "Print Gala Report" to export a clean, formatted audit summary for the club treasurer and faculty dean.
                </p>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
