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
    const titleMatch = evt.title.toLowerCase().includes(searchQuery.toLowerCase());
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
    <div className="space-y-8 max-w-7xl mx-auto pb-12">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-white dark:bg-slate-900 p-8 sm:p-10 border border-border dark:border-slate-800 shadow-odoo-card">
        <div className="absolute top-0 right-0 -mt-12 -mr-12 w-96 h-96 bg-brand-500/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 -mb-16 w-80 h-80 bg-accent-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 space-y-4 max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-50 border border-brand-200 text-brand-700 text-xs font-semibold uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5 text-brand-600" />
            <span>Campus Gatherings & Galas</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-black text-ink tracking-tight leading-tight">
            Events &amp; <span className="marker-highlight">Ticketing</span>
          </h1>

          <p className="text-ink-muted text-base sm:text-lg leading-relaxed">
            Discover upcoming student galas, hackathons, and speaker sessions.
            Enjoy exclusive member ticket discounts, real-time seat tracking, and instant QR check-ins.
          </p>

          <div className="pt-2 flex flex-wrap items-center gap-4 text-xs text-ink-muted">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Real-time live seat inventory</span>
            </div>
            <span>•</span>
            <div className="flex items-center gap-1.5">
              <Ticket className="w-3.5 h-3.5 text-brand-600" />
              <span>Instant digital ticket QR</span>
            </div>
            <span>•</span>
            <div className="flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-accent-500" />
              <span>Member discounted pricing</span>
            </div>
          </div>
        </div>
      </div>

      {/* Officer Management Action Bar (Only shown when relevant to officers/admins) */}
      {isOfficer && (
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-4 bg-brand-50/70 border border-brand-200/80 rounded-2xl shadow-sm">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-brand animate-pulse" />
            <span className="text-xs font-bold text-brand uppercase tracking-wider">
              Officer Event Actions
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-2.5">
            <Link to="/events/new">
              <Button variant="primary" size="sm" className="shadow-sm">
                <Plus className="w-4 h-4 mr-1.5" />
                Create Event
              </Button>
            </Link>
            <Link to="/events/checkin">
              <Button variant="outline" size="sm" className="bg-white hover:bg-muted border-border">
                <ShieldCheck className="w-4 h-4 mr-1.5 text-blue-600" />
                Ticket Check-In
              </Button>
            </Link>
            <Link to="/events/stats">
              <Button variant="outline" size="sm" className="bg-white hover:bg-muted border-border">
                <BarChart3 className="w-4 h-4 mr-1.5 text-purple-600" />
                Event Analytics
              </Button>
            </Link>
          </div>
        </div>
      )}

      {/* Controls Bar: Filters & Search */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-border dark:border-slate-800 shadow-odoo-card">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-subtle dark:text-slate-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Search by event title or venue..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-canvas dark:bg-slate-800 border border-border dark:border-slate-700 rounded-xl text-sm text-ink dark:text-white placeholder-ink-subtle dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-accent-500 transition-all"
          />
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-2">
          {['all', 'published', 'closed'].map((key) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold capitalize transition-all ${
                filter === key
                  ? 'bg-brand text-white shadow-sm'
                  : 'bg-muted text-ink-muted hover:text-ink hover:bg-border/60'
              }`}
            >
              {key === 'all' ? 'All Events' : key}
            </button>
          ))}

          <Button
            variant="ghost"
            size="sm"
            onClick={() => refetch()}
            disabled={isFetching}
            className="text-ink-muted hover:text-ink"
            title="Refresh events from server"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? 'animate-spin' : ''}`} />
          </Button>

          {isOfficer && (
            <Link to="/events/new">
              <Button variant="primary" size="sm" className="whitespace-nowrap text-xs">
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
            <Card key={i} className="animate-pulse border-border bg-white">
              <div className="h-40 bg-muted rounded-t-xl" />
              <CardContent className="p-6 space-y-4">
                <div className="h-4 bg-muted rounded w-1/3" />
                <div className="h-6 bg-muted rounded w-3/4" />
                <div className="h-4 bg-muted rounded w-1/2" />
                <div className="h-10 bg-muted rounded mt-4" />
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Error State */}
      {isError && (
        <Card className="border-danger-200 bg-danger-50 text-center p-8">
          <AlertCircle className="w-12 h-12 text-danger-500 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-danger-900">Unable to load events</h3>
          <p className="text-sm text-danger-700 mt-1 max-w-md mx-auto">
            {error?.message || 'Could not connect to the backend server. Please verify Django is running on port 8000.'}
          </p>
          <div className="mt-4">
            <Button variant="danger" size="sm" onClick={() => refetch()}>
              Try Again
            </Button>
          </div>
        </Card>
      )}

      {/* Empty State */}
      {!isLoading && !isError && filteredEvents.length === 0 && (
        <Card className="border-border bg-white text-center p-12 shadow-odoo-card">
          <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4 text-ink-subtle">
            <Calendar className="w-8 h-8" />
          </div>
          <h3 className="text-xl font-bold text-ink">No Events Found</h3>
          <p className="text-ink-muted text-sm max-w-md mx-auto mt-2">
            {searchQuery
              ? `No events matching "${searchQuery}". Try adjusting your search query.`
              : 'There are currently no events registered in the system.'}
          </p>
          {searchQuery && (
            <div className="mt-4">
              <Button variant="secondary" size="sm" onClick={() => setSearchQuery('')}>
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
            const dateInfo = formatEventDate(event.datetime);
            const remaining = event.availability?.remaining ?? (event.capacity - (event.availability?.sold || 0));
            const isSoldOut = remaining <= 0;
            const isMember = user?.role === 'member' || user?.role === 'leader' || user?.role === 'admin';

            return (
              <Card
                key={event.id}
                className="group flex flex-col justify-between hover:border-accent-300 hover:shadow-odoo-card-hover transition-all duration-300 bg-white border-border"
              >
                <div>
                  {/* Card Banner Image / Header Accent */}
                  <div className="relative h-28 bg-gradient-to-tr from-muted via-canvas to-brand-50 p-4 flex items-start justify-between border-b border-border">
                    {/* Date Badge */}
                    <div className="flex flex-col items-center justify-center bg-white dark:bg-slate-800 border border-border dark:border-slate-700 rounded-xl px-3 py-1 shadow-sm">
                      <span className="text-[10px] font-black tracking-wider text-accent">
                        {dateInfo.month}
                      </span>
                      <span className="text-lg font-extrabold text-ink dark:text-white leading-tight">
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
                      <h2 className="text-xl font-bold text-ink group-hover:text-accent transition-colors line-clamp-1">
                        {event.title}
                      </h2>
                      <p className="text-ink-muted text-xs mt-1.5 line-clamp-2 leading-relaxed">
                        {event.description || 'No description provided.'}
                      </p>
                    </div>

                    {/* Venue & Time details */}
                    <div className="space-y-2 text-xs text-ink-muted">
                      <div className="flex items-center gap-2">
                        <Clock className="w-3.5 h-3.5 text-ink-subtle shrink-0" />
                        <span>{dateInfo.fullDate} • {dateInfo.time}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <MapPin className="w-3.5 h-3.5 text-ink-subtle shrink-0" />
                        <span className="truncate">{event.venue}</span>
                      </div>
                    </div>

                    {/* Pricing Box */}
                    <div className="p-3 rounded-xl bg-muted border border-border space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-ink-muted">General Admission:</span>
                        <span className="font-semibold text-ink">
                          ${parseFloat(event.nonmember_price || 0).toFixed(2)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-brand font-medium flex items-center gap-1">
                          <Sparkles className="w-3 h-3" />
                          Club Member Price:
                        </span>
                        <span className="font-bold text-emerald-600">
                          ${parseFloat(event.member_price || 0).toFixed(2)}
                        </span>
                      </div>
                      {isMember && (
                        <div className="pt-1 text-[11px] text-emerald-700 font-medium">
                          ✓ Your active member rate applies at checkout
                        </div>
                      )}
                    </div>

                    {/* Real-time Seats Left Indicator */}
                    <div className="flex items-center justify-between pt-1">
                      <div className="flex items-center gap-2 text-xs">
                        <span
                          className={`w-2 h-2 rounded-full ${
                            isSoldOut ? 'bg-danger-500' : remaining < 10 ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500'
                          }`}
                        />
                        <span className={isSoldOut ? 'text-danger-600 font-semibold' : 'text-ink font-medium'}>
                          {isSoldOut ? 'Sold Out' : `${remaining} seat${remaining === 1 ? '' : 's'} remaining`}
                        </span>
                      </div>
                      <span className="text-[11px] text-ink-subtle">
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
                      className="w-full justify-between"
                    >
                      <span>{isSoldOut ? 'View Waitlist / Details' : 'View Details & Tickets'}</span>
                      <ArrowRight className="w-4 h-4 ml-1 transform group-hover:translate-x-1 transition-transform" />
                    </Button>
                  </Link>

                  {isOfficer && (
                    <div className="flex gap-2 pt-2 border-t border-border">
                      <Link to={`/events/${event.id}/stats`} className="flex-1">
                        <Button variant="secondary" size="sm" className="w-full text-xs h-7 text-ink-muted hover:text-ink">
                          <BarChart3 className="w-3 h-3 mr-1 text-brand" />
                          Stats
                        </Button>
                      </Link>
                      <Link to={`/events/${event.id}/edit`} className="flex-1">
                        <Button variant="secondary" size="sm" className="w-full text-xs h-7 text-ink-muted hover:text-ink">
                          <Edit3 className="w-3 h-3 mr-1" />
                          Edit
                        </Button>
                      </Link>
                      <Link to={`/events/${event.id}/checkin`} className="flex-1">
                        <Button variant="secondary" size="sm" className="w-full text-xs h-7 text-ink-muted hover:text-ink">
                          <ShieldCheck className="w-3 h-3 mr-1 text-accent" />
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
