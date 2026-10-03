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
        <div className="w-20 h-20 rounded-3xl bg-amber-50 border border-amber-200 flex items-center justify-center mx-auto text-amber-600">
          <ShieldAlert className="w-10 h-10" />
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-ink">Officer Analytics Access Required</h1>
          <p className="text-ink-muted text-sm leading-relaxed">
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
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-border dark:border-slate-800/80 print:hidden">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#714B67] dark:text-purple-400 mb-1.5">
            <span className="p-1.5 rounded-lg bg-purple-50 dark:bg-purple-950/50 border border-purple-200/60 dark:border-purple-800/50">
              <BarChart3 className="w-3.5 h-3.5" />
            </span>
            <span>Post-Event Audit & Executive Analytics</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-ink dark:text-slate-100 tracking-tight">
            Event Attendance & Financials
          </h1>
          <p className="text-xs sm:text-sm text-ink-muted dark:text-slate-400 mt-1">
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
            className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm border border-border dark:border-slate-800 text-ink dark:text-slate-100 text-xs rounded-2xl px-4 py-2.5 focus:outline-none focus:border-[#714B67] dark:focus:border-purple-500 font-medium shadow-sm"
          >
            {events.map((evt) => (
              <option key={evt.id} value={evt.id}>
                {evt.title} ({evt.status})
              </option>
            ))}
          </select>

          <Button variant="outline" size="sm" onClick={() => refetchStats()} className="text-xs rounded-full">
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${isStatsFetching ? 'animate-spin' : ''}`} />
            Refresh
          </Button>

          <Button variant="primary" size="sm" onClick={handlePrintReport} className="text-xs rounded-full shadow-md">
            <Printer className="w-3.5 h-3.5 mr-1.5" />
            Print Gala Report
          </Button>
        </div>
      </div>

      {/* Printable Report Header (Visible only when printing) */}
      <div className="hidden print:block mb-8 border-b pb-4">
        <h1 className="text-2xl font-bold text-ink">Skyline Student Association - Event Audit Report</h1>
        <h2 className="text-lg font-semibold text-ink mt-1">{stats?.event_title}</h2>
        <p className="text-xs text-gray-600">
          Generated on {new Date().toLocaleDateString()} by Officer {user?.name || user?.username}
        </p>
      </div>

      {isStatsLoading ? (
        <div className="py-20 text-center space-y-3">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto text-[#714B67] dark:text-purple-400" />
          <p className="text-sm text-ink-muted dark:text-slate-400">Loading audit statistics from tickets ledger...</p>
        </div>
      ) : isStatsError ? (
        <div className="p-6 rounded-3xl bg-rose-50/80 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 text-rose-800 dark:text-rose-300 text-center space-y-2 shadow-sm">
          <p className="text-sm font-bold">Failed to load statistics for this event.</p>
          <p className="text-xs text-rose-600 dark:text-rose-400">
            {statsError?.response?.data?.detail || statsError?.message}
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Quick Context Strip */}
          <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-2xl glass-panel shadow-sm text-xs">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-purple-50 dark:bg-purple-950/50 border border-purple-200/60 dark:border-purple-800/50 flex items-center justify-center text-[#714B67] dark:text-purple-400">
                <Ticket className="w-5 h-5" />
              </div>
              <div>
                <span className="text-ink-muted dark:text-slate-400 block text-[11px]">Audited Event</span>
                <span className="font-extrabold text-ink dark:text-slate-100 text-sm">{stats?.event_title}</span>
              </div>
            </div>

            <div className="flex items-center gap-2 print:hidden">
              <Link to={`/events/${selectedEventId}/checkin`}>
                <Button variant="outline" size="sm" className="text-xs h-8 rounded-full">
                  Gate Scanner
                </Button>
              </Link>
              <Link to={`/events/${selectedEventId}/edit`}>
                <Button variant="outline" size="sm" className="text-xs h-8 rounded-full">
                  Edit Event
                </Button>
              </Link>
              <Link to={`/events/${selectedEventId}`}>
                <Button variant="outline" size="sm" className="text-xs h-8 rounded-full">
                  Public Page
                </Button>
              </Link>
            </div>
          </div>

          {/* SECTION 1: ATTENDANCE RECONCILIATION */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200/60 dark:border-emerald-800/50 text-emerald-600 dark:text-emerald-400">
                <Users className="w-4 h-4" />
              </span>
              <h2 className="text-lg font-extrabold text-ink dark:text-slate-100 tracking-tight">
                Attendance & Gate Turnout Reconciliation
              </h2>
            </div>

            {/* Attendance KPI Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Admitted Count */}
              <Card className="glass-panel border-border dark:border-slate-800/80 shadow-glass">
                <CardContent className="p-5 flex items-center justify-between">
                  <div>
                    <span className="text-xs text-ink-muted dark:text-slate-400 font-bold uppercase tracking-wider block">
                      Actual Attendance
                    </span>
                    <div className="flex items-baseline gap-2 mt-1">
                      <span className="text-3xl font-extrabold text-emerald-600 dark:text-emerald-400">{attendance}</span>
                      <span className="text-xs text-slate-500">checked in</span>
                    </div>
                  </div>
                  <div className="w-12 h-12 rounded-2xl bg-emerald-50/80 dark:bg-emerald-950/50 border border-emerald-200/80 dark:border-emerald-800/50 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                    <UserCheck className="w-6 h-6" />
                  </div>
                </CardContent>
              </Card>

              {/* Turnout Rate */}
              <Card className="glass-panel border-border dark:border-slate-800/80 shadow-glass">
                <CardContent className="p-5 flex items-center justify-between">
                  <div>
                    <span className="text-xs text-ink-muted dark:text-slate-400 font-bold uppercase tracking-wider block">
                      Turnout Rate
                    </span>
                    <div className="flex items-baseline gap-2 mt-1">
                      <span className="text-3xl font-extrabold text-[#714B67] dark:text-purple-400">{attendanceRate}%</span>
                      <span className="text-xs text-slate-500">of ticket holders</span>
                    </div>
                  </div>
                  <div className="w-12 h-12 rounded-2xl bg-purple-50/80 dark:bg-purple-950/50 border border-purple-200/80 dark:border-purple-800/50 flex items-center justify-center text-[#714B67] dark:text-purple-400">
                    <TrendingUp className="w-6 h-6" />
                  </div>
                </CardContent>
              </Card>

              {/* Total Tickets Sold */}
              <Card className="glass-panel border-border dark:border-slate-800/80 shadow-glass">
                <CardContent className="p-5 flex items-center justify-between">
                  <div>
                    <span className="text-xs text-ink-muted dark:text-slate-400 font-bold uppercase tracking-wider block">
                      Tickets Sold
                    </span>
                    <div className="flex items-baseline gap-2 mt-1">
                      <span className="text-3xl font-extrabold text-ink dark:text-slate-100">{ticketsSold}</span>
                      <span className="text-xs text-slate-500">/ {capacity} capacity</span>
                    </div>
                  </div>
                  <div className="w-12 h-12 rounded-2xl bg-slate-100/80 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-ink-muted dark:text-slate-400">
                    <Ticket className="w-6 h-6" />
                  </div>
                </CardContent>
              </Card>

              {/* Absent / No-Shows */}
              <Card className="glass-panel border-border dark:border-slate-800/80 shadow-glass">
                <CardContent className="p-5 flex items-center justify-between">
                  <div>
                    <span className="text-xs text-ink-muted dark:text-slate-400 font-bold uppercase tracking-wider block">
                      No-Shows
                    </span>
                    <div className="flex items-baseline gap-2 mt-1">
                      <span className="text-3xl font-extrabold text-amber-600 dark:text-amber-400">{noShows}</span>
                      <span className="text-xs text-slate-500">({noShowRate}%)</span>
                    </div>
                  </div>
                  <div className="w-12 h-12 rounded-2xl bg-amber-50/80 dark:bg-amber-950/50 border border-amber-200/80 dark:border-amber-800/50 flex items-center justify-center text-amber-600 dark:text-amber-400">
                    <UserX className="w-6 h-6" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Visual Attendance Progress Breakdown */}
            <Card className="glass-panel border-border dark:border-slate-800/80 shadow-glass p-6 space-y-6">
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-ink dark:text-slate-100">Attendance Turnout vs No-Shows</span>
                  <span className="text-ink-muted dark:text-slate-400">
                    {attendance} Admitted ({attendanceRate}%) • {noShows} Absent ({noShowRate}%)
                  </span>
                </div>
                {/* Segmented Bar */}
                <div className="w-full h-4 bg-slate-100 dark:bg-slate-800/80 rounded-full overflow-hidden flex border border-border dark:border-slate-800 shadow-inner">
                  <div
                    className="bg-emerald-500 h-full transition-all duration-700"
                    style={{ width: `${attendanceRate}%` }}
                    title={`Admitted: ${attendance}`}
                  />
                  <div
                    className="bg-amber-400 h-full transition-all duration-700"
                    style={{ width: `${noShowRate}%` }}
                    title={`Absent: ${noShows}`}
                  />
                </div>
                <div className="flex justify-between text-[11px] text-ink-muted dark:text-slate-400">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
                    Admitted at Gate: {attendance}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block" />
                    Did Not Attend (No-Show): {noShows}
                  </span>
                </div>
              </div>

              {/* Ticket Holder Demographics (Member vs Non-Member Attendance) */}
              <div className="pt-4 border-t border-border dark:border-slate-800 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-ink dark:text-slate-100">Attendee Demographics</span>
                  <span className="text-ink-muted dark:text-slate-400">
                    {memberTickets} Members ({memberTicketShare}%) • {nonmemberTickets} Non-Members ({nonmemberTicketShare}%)
                  </span>
                </div>
                <div className="w-full h-3 bg-slate-100 dark:bg-slate-800/80 rounded-full overflow-hidden flex border border-border dark:border-slate-800 shadow-inner">
                  <div
                    className="bg-[#714B67] dark:bg-purple-600 h-full transition-all duration-700"
                    style={{ width: `${memberTicketShare}%` }}
                  />
                  <div
                    className="bg-[#017E84] dark:bg-teal-600 h-full transition-all duration-700"
                    style={{ width: `${nonmemberTicketShare}%` }}
                  />
                </div>
                <div className="flex justify-between text-[11px] text-ink-muted dark:text-slate-400">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#714B67] dark:bg-purple-600 inline-block" />
                    Club Members: {memberTickets} tickets
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#017E84] dark:bg-teal-600 inline-block" />
                    General Admission: {nonmemberTickets} tickets
                  </span>
                </div>
              </div>
            </Card>
          </div>

          {/* SECTION 2: FINANCIAL REVENUE RECONCILIATION */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200/60 dark:border-emerald-800/50 text-emerald-600 dark:text-emerald-400">
                <DollarSign className="w-4 h-4" />
              </span>
              <h2 className="text-lg font-extrabold text-ink dark:text-slate-100 tracking-tight">
                Financial Revenue Reconciliation
              </h2>
            </div>

            {/* Revenue KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Total Revenue */}
              <Card className="glass-panel border-border dark:border-slate-800/80 shadow-glass">
                <CardContent className="p-5 flex items-center justify-between">
                  <div>
                    <span className="text-xs text-ink-muted dark:text-slate-400 font-bold uppercase tracking-wider block">
                      Total Ticket Income
                    </span>
                    <div className="flex items-baseline gap-1 mt-1">
                      <span className="text-3xl font-extrabold text-emerald-600 dark:text-emerald-400">
                        ${totalRevenue.toFixed(2)}
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 block mt-0.5">
                      Recorded in club ledger
                    </span>
                  </div>
                  <div className="w-12 h-12 rounded-2xl bg-emerald-50/80 dark:bg-emerald-950/50 border border-emerald-200/80 dark:border-emerald-800/50 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                    <DollarSign className="w-6 h-6" />
                  </div>
                </CardContent>
              </Card>

              {/* Member Revenue */}
              <Card className="glass-panel border-border dark:border-slate-800/80 shadow-glass">
                <CardContent className="p-5 flex items-center justify-between">
                  <div>
                    <span className="text-xs text-ink-muted dark:text-slate-400 font-bold uppercase tracking-wider block">
                      Member Revenue
                    </span>
                    <div className="flex items-baseline gap-1 mt-1">
                      <span className="text-3xl font-extrabold text-[#714B67] dark:text-purple-400">
                        ${memberRevenue.toFixed(2)}
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 block mt-0.5">
                      {memberTickets} tickets ({memberRevenueShare}%)
                    </span>
                  </div>
                  <div className="w-12 h-12 rounded-2xl bg-purple-50/80 dark:bg-purple-950/50 border border-purple-200/80 dark:border-purple-800/50 flex items-center justify-center text-[#714B67] dark:text-purple-400">
                    <Sparkles className="w-6 h-6" />
                  </div>
                </CardContent>
              </Card>

              {/* Non-Member Revenue */}
              <Card className="glass-panel border-border dark:border-slate-800/80 shadow-glass">
                <CardContent className="p-5 flex items-center justify-between">
                  <div>
                    <span className="text-xs text-ink-muted dark:text-slate-400 font-bold uppercase tracking-wider block">
                      Non-Member Revenue
                    </span>
                    <div className="flex items-baseline gap-1 mt-1">
                      <span className="text-3xl font-extrabold text-[#017E84] dark:text-teal-400">
                        ${nonmemberRevenue.toFixed(2)}
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 block mt-0.5">
                      {nonmemberTickets} tickets ({nonmemberRevenueShare}%)
                    </span>
                  </div>
                  <div className="w-12 h-12 rounded-2xl bg-teal-50/80 dark:bg-teal-950/50 border border-teal-200/80 dark:border-teal-800/50 flex items-center justify-center text-[#017E84] dark:text-teal-400">
                    <Users className="w-6 h-6" />
                  </div>
                </CardContent>
              </Card>

              {/* Average Yield per Attendee */}
              <Card className="glass-panel border-border dark:border-slate-800/80 shadow-glass">
                <CardContent className="p-5 flex items-center justify-between">
                  <div>
                    <span className="text-xs text-ink-muted dark:text-slate-400 font-bold uppercase tracking-wider block">
                      Yield Per Attendee
                    </span>
                    <div className="flex items-baseline gap-1 mt-1">
                      <span className="text-3xl font-extrabold text-ink dark:text-slate-100">
                        ${avgRevPerAttendee}
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 block mt-0.5">
                      Avg across admitted guests
                    </span>
                  </div>
                  <div className="w-12 h-12 rounded-2xl bg-slate-100/80 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-ink-muted dark:text-slate-400">
                    <TrendingUp className="w-6 h-6" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Visual Revenue Breakdown Bar */}
            <Card className="glass-panel border-border dark:border-slate-800/80 shadow-glass p-6 space-y-4">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-ink dark:text-slate-100">Revenue Stream Contribution</span>
                <span className="text-ink-muted dark:text-slate-400">
                  Total Income: ${totalRevenue.toFixed(2)}
                </span>
              </div>

              {/* Proportional Segmented Revenue Bar */}
              <div className="w-full h-6 bg-slate-100 dark:bg-slate-800/80 rounded-2xl overflow-hidden flex border border-border dark:border-slate-800 shadow-inner">
                {memberRevenue > 0 && (
                  <div
                    className="bg-[#714B67] dark:bg-purple-600 h-full flex items-center justify-center text-[10px] font-bold text-white transition-all duration-700"
                    style={{ width: `${memberRevenueShare}%` }}
                    title={`Member: $${memberRevenue.toFixed(2)} (${memberRevenueShare}%)`}
                  >
                    {memberRevenueShare > 15 && `Members (${memberRevenueShare}%)`}
                  </div>
                )}
                {nonmemberRevenue > 0 && (
                  <div
                    className="bg-[#017E84] dark:bg-teal-600 h-full flex items-center justify-center text-[10px] font-bold text-white transition-all duration-700"
                    style={{ width: `${nonmemberRevenueShare}%` }}
                    title={`Non-Member: $${nonmemberRevenue.toFixed(2)} (${nonmemberRevenueShare}%)`}
                  >
                    {nonmemberRevenueShare > 15 && `General (${nonmemberRevenueShare}%)`}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4 pt-2 text-xs">
                <div className="p-4 rounded-2xl bg-white/40 dark:bg-slate-800/40 backdrop-blur-sm border border-border dark:border-slate-800 space-y-1">
                  <div className="flex items-center gap-1.5 text-[#714B67] dark:text-purple-400 font-bold">
                    <span className="w-2 h-2 rounded-full bg-[#714B67] dark:bg-purple-400" />
                    <span>Member Tier Sales</span>
                  </div>
                  <p className="text-ink dark:text-slate-100 font-extrabold text-lg">${memberRevenue.toFixed(2)}</p>
                  <p className="text-[11px] text-ink-muted dark:text-slate-400">
                    {memberTickets} tickets sold at discounted club member rates
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-white/40 dark:bg-slate-800/40 backdrop-blur-sm border border-border dark:border-slate-800 space-y-1">
                  <div className="flex items-center gap-1.5 text-[#017E84] dark:text-teal-400 font-bold">
                    <span className="w-2 h-2 rounded-full bg-[#017E84] dark:bg-teal-400" />
                    <span>General Admission Sales</span>
                  </div>
                  <p className="text-ink dark:text-slate-100 font-extrabold text-lg">${nonmemberRevenue.toFixed(2)}</p>
                  <p className="text-[11px] text-ink-muted dark:text-slate-400">
                    {nonmemberTickets} tickets sold at standard public rates
                  </p>
                </div>
              </div>
            </Card>
          </div>

          {/* SECTION 3: POST-GALA OFFICER AUDIT CHECKLIST */}
          <Card className="glass-panel border-border dark:border-slate-800/80 shadow-glass p-6 space-y-4">
            <h3 className="font-bold text-ink dark:text-slate-100 text-sm flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200/60 dark:border-emerald-800/50 text-emerald-600 dark:text-emerald-400">
                <ShieldCheck className="w-4 h-4" />
              </span>
              Post-Gala Reconciliation Workflow & Single Source of Truth
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              <div className="p-4 rounded-2xl bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm border border-border dark:border-slate-800 shadow-sm space-y-1.5">
                <span className="font-extrabold text-emerald-700 dark:text-emerald-400 block">1. Door vs Ticket Audit</span>
                <p className="text-ink-muted dark:text-slate-400 text-[11px] leading-relaxed">
                  Compare total {attendance} scanned QR admissions against {ticketsSold} paid tickets. {noShows} guests did not attend.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm border border-border dark:border-slate-800 shadow-sm space-y-1.5">
                <span className="font-extrabold text-[#714B67] dark:text-purple-400 block">2. Core Ledger Income</span>
                <p className="text-ink-muted dark:text-slate-400 text-[11px] leading-relaxed">
                  All ${totalRevenue.toFixed(2)} was automatically recorded under category <code className="bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded text-ink dark:text-slate-200 font-mono">'ticket'</code> in the central finance ledger.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm border border-border dark:border-slate-800 shadow-sm space-y-1.5">
                <span className="font-extrabold text-[#017E84] dark:text-teal-400 block">3. Executive Reporting</span>
                <p className="text-ink-muted dark:text-slate-400 text-[11px] leading-relaxed">
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
