import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Calendar,
  MapPin,
  Clock,
  Ticket,
  Users,
  Search,
  ArrowRight,
  Sparkles,
  AlertCircle,
  RefreshCw,
  Plus,
  BarChart3,
  Edit3,
  ShieldCheck,
} from 'lucide-react';
import { fetchEvents } from './eventsApi';
import { useAuth } from '../../lib/AuthContext';
import { Card, CardContent } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';

export default function EventsListPage() {
  const { user, isOfficer } = useAuth();
  const [filter, setFilter] = useState('all'); // all, published, closed
  const [searchQuery, setSearchQuery] = useState('');

  const {
    data: events = [],
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ['events', filter],
    queryFn: () => fetchEvents(filter === 'all' ? null : filter),
    staleTime: 1000 * 15,
  });

  const filteredEvents = events.filter((evt) => {
    const titleMatch = evt.title?.toLowerCase().includes(searchQuery.toLowerCase());
    const venueMatch = evt.venue?.toLowerCase().includes(searchQuery.toLowerCase());
    return titleMatch || venueMatch;
  });

  const formatEventDate = (dateString) => {
    if (!dateString) return { date: 'TBA', time: '', month: '', day: '' };
    const date = new Date(dateString);
    return {
      month: date.toLocaleString('default', { month: 'short' }).toUpperCase(),
      day: date.getDate(),
      fullDate: date.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      }),
      time: date.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      }),
    };
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'published':
        return <Badge variant="success" size="sm">Open for RSVP</Badge>;
      case 'closed':
        return <Badge variant="danger" size="sm">Closed</Badge>;
      case 'draft':
        return <Badge variant="warning" size="sm">Draft</Badge>;
      default:
        return <Badge variant="neutral" size="sm">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-12 animate-fadeIn">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-3xl glass-panel p-8 sm:p-10 border border-white/40 dark:border-slate-800/80 shadow-2xl">
        <div className="absolute top-0 right-0 -mt-12 -mr-12 w-96 h-96 bg-brand-500/10 dark:bg-brand-500/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 -mb-16 w-80 h-80 bg-indigo-500/10 dark:bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 space-y-4 max-w-3xl">
          <div className="dual-badge-pill">
            <Sparkles className="w-3.5 h-3.5 text-brand-600 dark:text-brand-300" />
            <span>Campus Gatherings & Galas</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-black text-slate-900 dark:text-white tracking-tight leading-tight">
            Events &amp; <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-600 to-indigo-500 dark:from-brand-400 dark:to-indigo-300">Ticketing</span>
          </h1>

          <p className="text-slate-600 dark:text-slate-300 text-base sm:text-lg leading-relaxed">
            Discover upcoming student galas, hackathons, and speaker sessions.
            Enjoy exclusive member ticket discounts, real-time seat tracking, and instant QR check-ins.
          </p>

          <div className="pt-2 flex flex-wrap items-center gap-4 text-xs text-slate-500 dark:text-slate-400">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Real-time live seat inventory</span>
            </div>
            <span>•</span>
            <div className="flex items-center gap-1.5">
              <Ticket className="w-3.5 h-3.5 text-brand-600 dark:text-brand-400" />
              <span>Instant digital ticket QR</span>
            </div>
            <span>•</span>
            <div className="flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-indigo-500" />
              <span>Member discounted pricing</span>
            </div>
          </div>
        </div>
      </div>

      {/* Officer Management Action Bar */}
      {isOfficer && (
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-4 glass-card bg-brand-500/5 dark:bg-brand-500/10 border border-brand-500/20 dark:border-brand-500/30 rounded-3xl shadow-sm">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-brand-600 dark:bg-brand-400 animate-pulse" />
            <span className="text-xs font-bold text-brand-700 dark:text-brand-300 uppercase tracking-wider">
              Officer Event Actions
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-2.5">
            <Link to="/events/new">
              <Button variant="primary" size="sm" className="shadow-md shadow-brand-500/20 font-bold rounded-full">
                <Plus className="w-4 h-4 mr-1.5" />
                Create Event
              </Button>
            </Link>
            <Link to="/events/checkin">
              <Button variant="outline" size="sm" className="gap-1.5 rounded-full border-slate-200/80 dark:border-slate-700/80 font-bold">
                <ShieldCheck className="w-4 h-4 text-brand-600 dark:text-brand-400" />
                Door Scanner
              </Button>
            </Link>
            <Link to="/events/stats">
              <Button variant="outline" size="sm" className="gap-1.5 rounded-full border-slate-200/80 dark:border-slate-700/80 font-bold">
                <BarChart3 className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                Event Analytics
              </Button>
            </Link>
          </div>
        </div>
      )}

      {/* Controls Bar: Filters & Search */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 glass-panel p-4 sm:p-5 rounded-3xl border border-white/40 dark:border-slate-800/80 shadow-sm">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500 pointer-events-none" />
          <input
            type="text"
            placeholder="Search by event title or venue..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white/80 dark:bg-slate-900/70 border border-slate-200/80 dark:border-slate-700/80 rounded-2xl text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 dark:focus:border-brand-400 transition-all font-medium"
          />
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-2 overflow-x-auto">
          <div className="flex items-center gap-1.5 p-1 bg-slate-100/80 dark:bg-slate-800/80 backdrop-blur-md rounded-2xl border border-slate-200/80 dark:border-slate-700/80">
            {['all', 'published', 'closed'].map((key) => (
              <button
                key={key}
                onClick={() => setFilter(key)}
                className={`px-4 py-1.5 rounded-xl text-xs font-bold capitalize transition-all whitespace-nowrap ${
                  filter === key
                    ? 'bg-gradient-to-r from-brand-600 to-indigo-600 text-white shadow-md shadow-brand-500/25'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-white/60 dark:hover:bg-white/10'
                }`}
              >
                {key === 'all' ? 'All Events' : key}
              </button>
            ))}
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => refetch()}
            disabled={isFetching}
            className="p-2 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white rounded-full"
            title="Refresh events from server"
          >
            <RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} />
          </Button>

          {isOfficer && (
            <Link to="/events/new">
              <Button variant="primary" size="sm" className="whitespace-nowrap text-xs font-bold shadow-md shadow-brand-500/20 rounded-full">
                <Plus className="w-3.5 h-3.5 mr-1" />
                New Event
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* Loading Skeleton State */}
      {isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Card key={i} className="animate-pulse glass-panel border-white/40 dark:border-slate-800/80 rounded-3xl">
              <div className="h-28 bg-slate-100 dark:bg-slate-800/60 rounded-t-3xl" />
              <CardContent className="p-6 space-y-4">
                <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-1/3" />
                <div className="h-6 bg-slate-200 dark:bg-slate-800 rounded w-3/4" />
                <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-1/2" />
                <div className="h-10 bg-slate-200 dark:bg-slate-800 rounded-full mt-4" />
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Error State */}
      {isError && (
        <Card className="glass-panel border-rose-200/80 dark:border-rose-900/50 bg-rose-50/80 dark:bg-rose-950/30 text-center p-8 rounded-3xl">
          <AlertCircle className="w-12 h-12 text-rose-500 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-rose-900 dark:text-rose-100">Unable to load events</h3>
          <p className="text-sm text-rose-700 dark:text-rose-300 mt-1 max-w-md mx-auto">
            {error?.message || 'Could not connect to the backend server. Please verify Django is running on port 8000.'}
          </p>
          <div className="mt-4">
            <Button variant="danger" size="sm" onClick={() => refetch()} className="rounded-full font-bold">
              Try Again
            </Button>
          </div>
        </Card>
      )}

      {/* Empty State */}
      {!isLoading && !isError && filteredEvents.length === 0 && (
        <Card className="glass-panel text-center p-12 shadow-xl rounded-3xl border-white/40 dark:border-slate-800/80">
          <div className="w-16 h-16 rounded-3xl bg-brand-500/10 dark:bg-brand-500/20 flex items-center justify-center mx-auto mb-4 text-brand-600 dark:text-brand-400">
            <Calendar className="w-8 h-8" />
          </div>
          <h3 className="text-xl font-bold text-slate-900 dark:text-white">No Events Found</h3>
          <p className="text-slate-500 dark:text-slate-400 text-sm max-w-md mx-auto mt-2">
            {searchQuery
              ? `No events matching "${searchQuery}". Try adjusting your search query.`
              : 'There are currently no events registered in the system.'}
          </p>
          {searchQuery && (
            <div className="mt-4">
              <Button variant="secondary" size="sm" onClick={() => setSearchQuery('')} className="rounded-full">
                Clear Search
              </Button>
            </div>
          )}
        </Card>
      )}

      {/* Events Grid */}
      {!isLoading && !isError && filteredEvents.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredEvents.map((event) => {
            const dateInfo = formatEventDate(event.event_date || event.datetime);
            const remaining = event.availability?.remaining ?? (event.capacity - (event.availability?.sold || 0));
            const isSoldOut = remaining <= 0;
            const isMember = user?.role === 'member' || user?.role === 'leader' || user?.role === 'admin';

            return (
              <Card
                key={event.id}
                className="group flex flex-col justify-between hover:-translate-y-1 transition-all duration-300 rounded-3xl glass-panel border-white/40 dark:border-slate-800/80 shadow-lg hover:shadow-2xl overflow-hidden"
              >
                <div>
                  {/* Card Banner Image / Header Accent */}
                  <div className="relative h-28 bg-gradient-to-tr from-slate-100/80 via-white/50 to-brand-500/10 dark:from-slate-900 dark:via-slate-800/80 dark:to-brand-900/30 p-4 flex items-start justify-between border-b border-slate-100 dark:border-slate-800/60">
                    {/* Date Badge */}
                    <div className="flex flex-col items-center justify-center bg-white/90 dark:bg-slate-800/90 backdrop-blur-md border border-slate-200/80 dark:border-slate-700/80 rounded-2xl px-3.5 py-1.5 shadow-sm">
                      <span className="text-[10px] font-black tracking-wider text-brand-600 dark:text-brand-400">
                        {dateInfo.month}
                      </span>
                      <span className="text-lg font-extrabold text-slate-900 dark:text-white leading-tight">
                        {dateInfo.day}
                      </span>
                    </div>

                    {/* Status Badge */}
                    <div className="flex items-center gap-1.5">
                      {getStatusBadge(event.status)}
                    </div>
                  </div>

                  {/* Body Content */}
                  <div className="p-6 space-y-4">
                    <div>
                      <h2 className="text-xl font-bold text-slate-900 dark:text-white group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors line-clamp-1">
                        {event.title}
                      </h2>
                      <p className="text-slate-600 dark:text-slate-300 text-xs mt-1.5 line-clamp-2 leading-relaxed">
                        {event.description || 'No description provided.'}
                      </p>
                    </div>

                    {/* Venue & Time details */}
                    <div className="space-y-2 text-xs text-slate-500 dark:text-slate-400">
                      <div className="flex items-center gap-2">
                        <Clock className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 shrink-0" />
                        <span>{dateInfo.fullDate} • {dateInfo.time}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <MapPin className="w-3.5 h-3.5 text-brand-600 dark:text-brand-400 shrink-0" />
                        <span className="truncate">{event.venue}</span>
                      </div>
                    </div>

                    {/* Pricing Box */}
                    <div className="p-3.5 rounded-2xl bg-slate-50/80 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-500 dark:text-slate-400">General Admission:</span>
                        <span className="font-semibold text-slate-900 dark:text-white">
                          ${parseFloat(event.nonmember_price || 0).toFixed(2)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-brand-600 dark:text-brand-400 font-semibold flex items-center gap-1">
                          <Sparkles className="w-3 h-3" />
                          Club Member Price:
                        </span>
                        <span className="font-bold text-emerald-600 dark:text-emerald-400">
                          ${parseFloat(event.member_price || 0).toFixed(2)}
                        </span>
                      </div>
                      {isMember && (
                        <div className="pt-1 text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                          ✓ Your active member rate applies at checkout
                        </div>
                      )}
                    </div>

                    {/* Real-time Seats Left Indicator */}
                    <div className="flex items-center justify-between pt-1">
                      <div className="flex items-center gap-2 text-xs">
                        <span
                          className={`w-2 h-2 rounded-full ${
                            isSoldOut ? 'bg-rose-500' : remaining < 10 ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500'
                          }`}
                        />
                        <span className={isSoldOut ? 'text-rose-600 dark:text-rose-400 font-semibold' : 'text-slate-800 dark:text-slate-200 font-medium'}>
                          {isSoldOut ? 'Sold Out' : `${remaining} seat${remaining === 1 ? '' : 's'} remaining`}
                        </span>
                      </div>
                      <span className="text-[11px] text-slate-400 dark:text-slate-500 font-mono">
                        Cap: {event.capacity}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Footer Action */}
                <div className="p-6 pt-0 space-y-2">
                  <Link to={`/events/${event.id}`} className="block w-full">
                    <Button
                      variant={isSoldOut ? 'secondary' : 'primary'}
                      className="w-full justify-between font-bold shadow-md rounded-full"
                    >
                      <span>{isSoldOut ? 'View Details & Tickets' : 'View Details & Tickets'}</span>
                      <ArrowRight className="w-4 h-4 ml-1 transform group-hover:translate-x-1 transition-transform" />
                    </Button>
                  </Link>

                  {isOfficer && (
                    <div className="flex gap-2 pt-2 border-t border-slate-100 dark:border-slate-800/60">
                      <Link to={`/events/${event.id}/stats`} className="flex-1">
                        <Button variant="secondary" size="sm" className="w-full text-xs h-8 rounded-full">
                          <BarChart3 className="w-3 h-3 mr-1 text-brand-600 dark:text-brand-400" />
                          Stats
                        </Button>
                      </Link>
                      <Link to={`/events/${event.id}/edit`} className="flex-1">
                        <Button variant="secondary" size="sm" className="w-full text-xs h-8 rounded-full">
                          <Edit3 className="w-3 h-3 mr-1" />
                          Edit
                        </Button>
                      </Link>
                      <Link to={`/events/${event.id}/checkin`} className="flex-1">
                        <Button variant="secondary" size="sm" className="w-full text-xs h-8 rounded-full">
                          <ShieldCheck className="w-3 h-3 mr-1 text-indigo-500" />
                          Gate
                        </Button>
                      </Link>
                    </div>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

