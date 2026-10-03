import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Calendar,
  MapPin,
  Clock,
  Ticket as TicketIcon,
  Users,
  ArrowLeft,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  QrCode,
  Download,
  Printer,
  ShieldCheck,
  RefreshCw,
  ExternalLink,
} from 'lucide-react';
import {
  fetchEventById,
  fetchEventAvailability,
  fetchMemberStatus,
  purchaseTicket,
} from './eventsApi';
import { useAuth } from '../../lib/AuthContext';
import { useToast } from '../../components/ui/Toast';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';

export default function EventDetailPage() {
  const { id } = useParams();
  const queryClient = useQueryClient();
  const toast = useToast();
  const { user, isAuthenticated } = useAuth();

  // Purchased ticket result state
  const [purchasedTicket, setPurchasedTicket] = useState(null);

  // Form input state
  const [formData, setFormData] = useState({
    holder_name: '',
    holder_email: '',
  });
  const [formErrors, setFormErrors] = useState({});

  // 1. Fetch Event Details
  const {
    data: event,
    isLoading: isEventLoading,
    isError: isEventError,
    error: eventError,
  } = useQuery({
    queryKey: ['event', id],
    queryFn: () => fetchEventById(id),
  });

  // 2. Fetch Live Availability with Short Polling Interval (every 3000ms / 3s)
  const {
    data: availability,
    isFetching: isAvailFetching,
  } = useQuery({
    queryKey: ['event-availability', id],
    queryFn: () => fetchEventAvailability(id),
    refetchInterval: 3000, // Live real-time counter updates from Postgres
    refetchIntervalInBackground: false,
    enabled: !!id,
  });

  // 3. Fetch Member Status for Dynamic Pricing
  // // MOCK /api/members/me: swap at integration
  const { data: memberStatus } = useQuery({
    queryKey: ['member-status', user?.id],
    queryFn: fetchMemberStatus,
    enabled: isAuthenticated,
    staleTime: 1000 * 60,
  });

  // Pre-fill authenticated user details into purchase form
  useEffect(() => {
    if (user) {
      setFormData({
        holder_name: user.name || user.username || '',
        holder_email: user.email || '',
      });
    }
  }, [user]);

  // Pricing determination
  const isMember = Boolean(
    memberStatus?.is_active_member ||
    user?.role === 'member' ||
    user?.role === 'leader' ||
    user?.role === 'admin'
  );

  const memberPrice = parseFloat(event?.member_price || 0);
  const nonmemberPrice = parseFloat(event?.nonmember_price || 0);
  const applicablePrice = isMember ? memberPrice : nonmemberPrice;
  const savings = Math.max(0, nonmemberPrice - memberPrice);

  // Seats math
  const capacity = availability?.capacity ?? (event?.capacity || 0);
  const sold = availability?.sold ?? (event?.availability?.sold || 0);
  const remaining = availability?.remaining ?? Math.max(0, capacity - sold);
  const isSoldOut = remaining <= 0;
  const occupancyPercent = capacity > 0 ? Math.min(100, Math.round((sold / capacity) * 100)) : 0;

  // Inline Form Validation
  const validateForm = () => {
    const errs = {};
    if (!formData.holder_name.trim()) {
      errs.holder_name = 'Attendee full name is required.';
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!formData.holder_email.trim()) {
      errs.holder_email = 'Contact email address is required.';
    } else if (!emailRegex.test(formData.holder_email.trim())) {
      errs.holder_email = 'Please provide a valid email format (e.g. student@skyline.edu).';
    }
    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  };

  // Ticket Purchase Mutation
  const purchaseMutation = useMutation({
    mutationFn: (ticketData) => purchaseTicket(id, ticketData),
    onSuccess: (newTicket) => {
      setPurchasedTicket(newTicket);
      toast.success('Ticket confirmed! Your QR boarding pass is ready.');
      // Instantly invalidate availability to update live seats count
      queryClient.invalidateQueries({ queryKey: ['event-availability', id] });
      queryClient.invalidateQueries({ queryKey: ['events'] });
    },
    onError: (err) => {
      const msg =
        err.response?.data?.detail ||
        err.response?.data?.message ||
        'Unable to complete ticket purchase. Please try again.';
      toast.error(msg);
      // Re-fetch availability in case the last seat was just purchased
      queryClient.invalidateQueries({ queryKey: ['event-availability', id] });
    },
  });

  const handleSubmitPurchase = (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    purchaseMutation.mutate({
      holder_name: formData.holder_name.trim(),
      holder_email: formData.holder_email.trim(),
    });
  };

  const handlePrintTicket = () => {
    window.print();
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  if (isEventLoading) {
    return (
      <div className="max-w-5xl mx-auto space-y-6 animate-pulse py-8">
        <div className="h-6 bg-slate-800 rounded w-32" />
        <div className="h-64 bg-surface-900 rounded-3xl border border-slate-800" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 h-96 bg-surface-900 rounded-2xl border border-slate-800" />
          <div className="h-96 bg-surface-900 rounded-2xl border border-slate-800" />
        </div>
      </div>
    );
  }

  if (isEventError || !event) {
    return (
      <div className="max-w-2xl mx-auto py-12 text-center space-y-4">
        <AlertCircle className="w-12 h-12 text-danger-400 mx-auto" />
        <h2 className="text-2xl font-bold text-white">Event Not Found</h2>
        <p className="text-slate-400 text-sm">
          {eventError?.message || 'The requested event does not exist or has been removed.'}
        </p>
        <Link to="/events">
          <Button variant="secondary" className="mt-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Events List
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-16">
      {/* Breadcrumb Back Link */}
      <div>
        <Link
          to="/events"
          className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to All Events</span>
        </Link>
      </div>

      {/* SUCCESS CONFIRMATION MODAL / TICKET DISPLAY */}
      {purchasedTicket ? (
        <div className="space-y-6 animate-fade-in">
          <div className="p-4 rounded-2xl bg-emerald-950/80 border border-emerald-500/40 text-emerald-200 flex items-center justify-between shadow-xl">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0" />
              <div>
                <h3 className="font-bold text-base text-white">Ticket Purchase Confirmed!</h3>
                <p className="text-xs text-emerald-300/90">
                  Your ticket has been recorded in the central club ledger. Present your QR code at the door for entry.
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handlePrintTicket} className="hidden sm:inline-flex">
                <Printer className="w-3.5 h-3.5 mr-1.5" />
                Print Ticket
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => setPurchasedTicket(null)}
              >
                Buy Another
              </Button>
            </div>
          </div>

          {/* Realistic Perforated Digital Ticket Pass */}
          <div className="max-w-2xl mx-auto bg-surface-900 border border-slate-700/80 rounded-3xl overflow-hidden shadow-2xl relative">
            {/* Header Accent */}
            <div className="bg-gradient-to-r from-brand-600 via-brand-700 to-accent-600 p-6 sm:p-8 text-white">
              <div className="flex items-center justify-between text-xs font-semibold tracking-wider uppercase opacity-90 mb-2">
                <span>Skyline Student Association</span>
                <span className="bg-white/20 px-2.5 py-0.5 rounded-full backdrop-blur-sm">
                  {purchasedTicket.type === 'member' ? 'Member Ticket' : 'General Admission'}
                </span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold">{event.title}</h2>
              <p className="text-brand-100 text-xs sm:text-sm mt-1">{formatDateTime(event.datetime)}</p>
            </div>

            {/* Ticket Body Content */}
            <div className="p-6 sm:p-8 grid grid-cols-1 sm:grid-cols-3 gap-6 items-center">
              {/* Left Column: Attendee & Event Details */}
              <div className="sm:col-span-2 space-y-4 text-sm">
                <div>
                  <span className="text-xs text-slate-400 uppercase tracking-wider block">Attendee Name</span>
                  <span className="font-bold text-white text-base">{purchasedTicket.holder_name}</span>
                </div>
                <div>
                  <span className="text-xs text-slate-400 uppercase tracking-wider block">Email</span>
                  <span className="font-medium text-slate-200">{purchasedTicket.holder_email}</span>
                </div>
                <div>
                  <span className="text-xs text-slate-400 uppercase tracking-wider block">Venue</span>
                  <span className="font-medium text-slate-200 flex items-center gap-1.5 mt-0.5">
                    <MapPin className="w-3.5 h-3.5 text-brand-400" />
                    {event.venue}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-4 pt-2 border-t border-slate-800">
                  <div>
                    <span className="text-xs text-slate-400 uppercase tracking-wider block">Price Paid</span>
                    <span className="font-bold text-emerald-400 text-lg">
                      ${parseFloat(purchasedTicket.price_paid || 0).toFixed(2)}
                    </span>
                  </div>
                  <div>
                    <span className="text-xs text-slate-400 uppercase tracking-wider block">Status</span>
                    <Badge variant="success" size="sm" className="mt-1">
                      {purchasedTicket.status?.toUpperCase()}
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Right Column: QR Code Container */}
              <div className="flex flex-col items-center justify-center p-4 bg-white rounded-2xl shadow-inner border border-slate-200">
                {purchasedTicket.qr_code_data_url ? (
                  <img
                    src={purchasedTicket.qr_code_data_url}
                    alt="Ticket QR Code"
                    className="w-36 h-36 object-contain"
                  />
                ) : (
                  <img
                    src={`/api/tickets/${purchasedTicket.token}/qr`}
                    alt="Ticket QR Code"
                    className="w-36 h-36 object-contain"
                  />
                )}
                <span className="text-[10px] text-slate-800 font-mono font-semibold mt-2 tracking-tighter text-center truncate max-w-[140px]">
                  {purchasedTicket.token}
                </span>
                <span className="text-[9px] text-slate-500 text-center mt-0.5">
                  Scan at entrance
                </span>
              </div>
            </div>

            {/* Ticket Footer Security Stripe */}
            <div className="px-6 py-3 bg-surface-950/80 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400 font-mono">
              <span className="flex items-center gap-1.5 text-emerald-400">
                <ShieldCheck className="w-4 h-4" />
                Verified cryptographic ticket token
              </span>
              <span className="text-[11px] text-slate-500">ID: {purchasedTicket.token.slice(0, 8)}...</span>
            </div>
          </div>
        </div>
      ) : null}

      {/* EVENT DETAILS & PURCHASE GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* Left Column: Event Overview & Information */}
        <div className="lg:col-span-2 space-y-6">
          {/* Main Hero Card */}
          <Card className="bg-surface-900/80 border-slate-800 overflow-hidden shadow-2xl">
            <div className="p-8 sm:p-10 space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <Badge variant={event.status === 'published' ? 'success' : 'warning'} size="md">
                  {event.status === 'published' ? 'Registration Open' : event.status}
                </Badge>
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <Clock className="w-3.5 h-3.5" />
                  <span>Added {new Date(event.created_at).toLocaleDateString()}</span>
                </div>
              </div>

              <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight leading-tight">
                {event.title}
              </h1>

              {/* Event Metadata Strip */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-2xl bg-surface-950/60 border border-slate-800 text-sm">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-brand-500/10 border border-brand-500/20 flex items-center justify-center text-brand-400">
                    <Calendar className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-xs text-slate-400 block">Date & Time</span>
                    <span className="font-semibold text-white text-xs sm:text-sm">
                      {formatDateTime(event.datetime)}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-accent-500/10 border border-accent-500/20 flex items-center justify-center text-accent-400">
                    <MapPin className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-xs text-slate-400 block">Venue / Location</span>
                    <span className="font-semibold text-white text-xs sm:text-sm">
                      {event.venue}
                    </span>
                  </div>
                </div>
              </div>

              {/* Description */}
              <div className="space-y-3">
                <h3 className="text-base font-bold text-white tracking-wide uppercase text-xs text-slate-400">
                  About This Event
                </h3>
                <p className="text-slate-300 text-sm sm:text-base leading-relaxed whitespace-pre-line">
                  {event.description || 'No detailed description provided for this campus event.'}
                </p>
              </div>
            </div>
          </Card>
        </div>

        {/* Right Column: Live Inventory & Ticket Checkout Box */}
        <div className="space-y-6">
          <Card className="bg-surface-900 border-slate-800 shadow-2xl relative overflow-hidden">
            {/* Live Indicator Pulse Strip */}
            <div className="bg-surface-950 px-5 py-2.5 border-b border-slate-800 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                </span>
                <span className="text-slate-300 font-medium">Live Seat Inventory</span>
              </div>
              <span className="text-[11px] text-slate-500 flex items-center gap-1">
                <RefreshCw className={`w-3 h-3 ${isAvailFetching ? 'animate-spin text-brand-400' : ''}`} />
                Auto-syncs
              </span>
            </div>

            <CardContent className="p-6 space-y-6">
              {/* Real-time Seats Left Counter */}
              <div className="space-y-2">
                <div className="flex items-baseline justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Seats Available
                  </span>
                  <div className="text-right">
                    <span
                      className={`text-3xl font-black ${
                        isSoldOut ? 'text-rose-400' : remaining < 10 ? 'text-amber-400' : 'text-emerald-400'
                      }`}
                    >
                      {remaining}
                    </span>
                    <span className="text-xs text-slate-400 font-medium ml-1">/ {capacity} left</span>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="w-full h-2 bg-surface-950 rounded-full overflow-hidden border border-slate-800">
                  <div
                    className={`h-full transition-all duration-500 ${
                      isSoldOut ? 'bg-rose-500' : occupancyPercent > 80 ? 'bg-amber-400' : 'bg-emerald-500'
                    }`}
                    style={{ width: `${occupancyPercent}%` }}
                  />
                </div>
                <div className="flex justify-between text-[11px] text-slate-500">
                  <span>{sold} ticket{sold === 1 ? '' : 's'} claimed</span>
                  <span>{occupancyPercent}% full</span>
                </div>
              </div>

              {/* Dynamic Member vs Non-Member Pricing Callout */}
              <div className="p-4 rounded-xl bg-surface-950/80 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-400">Your Ticket Price:</span>
                  <div className="text-right">
                    <span className="text-2xl font-black text-white">
                      ${applicablePrice.toFixed(2)}
                    </span>
                    {isMember && savings > 0 && (
                      <span className="text-[11px] text-emerald-400 block font-medium">
                        You save ${savings.toFixed(2)}!
                      </span>
                    )}
                  </div>
                </div>

                {/* Pricing Tier Notice */}
                <div className="pt-2 border-t border-slate-800 text-xs">
                  {isMember ? (
                    <div className="flex items-center gap-1.5 text-emerald-400 font-medium">
                      <Sparkles className="w-3.5 h-3.5 shrink-0" />
                      <span>Active Member Pricing applied ({user?.name || user?.username})</span>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <div className="flex justify-between text-slate-400 text-xs">
                        <span>Standard General Admission:</span>
                        <span>${nonmemberPrice.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-brand-300 font-medium text-xs">
                        <span>Club Member Rate:</span>
                        <span className="text-emerald-400 font-bold">${memberPrice.toFixed(2)}</span>
                      </div>
                      {!isAuthenticated && (
                        <p className="text-[11px] text-slate-500 pt-1">
                          <Link to="/login" className="text-brand-400 hover:underline">
                            Log in as member
                          </Link>{' '}
                          to unlock member rates.
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* BUY TICKET FORM */}
              {isSoldOut ? (
                <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-800 text-center space-y-2">
                  <h4 className="font-bold text-rose-300 text-sm">Event is Completely Sold Out</h4>
                  <p className="text-xs text-rose-400/90">
                    All {capacity} seats have been reserved. Please check back later in case seats are released.
                  </p>
                </div>
              ) : (
                <form onSubmit={handleSubmitPurchase} className="space-y-4">
                  <div className="space-y-3">
                    <Input
                      label="Attendee Full Name"
                      placeholder="e.g. Alex Johnson"
                      value={formData.holder_name}
                      onChange={(e) => {
                        setFormData((prev) => ({ ...prev, holder_name: e.target.value }));
                        if (formErrors.holder_name) {
                          setFormErrors((prev) => ({ ...prev, holder_name: null }));
                        }
                      }}
                      error={formErrors.holder_name}
                      disabled={purchaseMutation.isPending}
                    />

                    <Input
                      label="Confirmation Email"
                      type="email"
                      placeholder="e.g. alex@skyline.edu"
                      value={formData.holder_email}
                      onChange={(e) => {
                        setFormData((prev) => ({ ...prev, holder_email: e.target.value }));
                        if (formErrors.holder_email) {
                          setFormErrors((prev) => ({ ...prev, holder_email: null }));
                        }
                      }}
                      error={formErrors.holder_email}
                      helperText="Your QR code boarding pass will be linked to this email address."
                      disabled={purchaseMutation.isPending}
                    />
                  </div>

                  {purchaseMutation.isError && (
                    <div className="p-3 rounded-lg bg-danger-950/80 border border-danger-800 text-danger-200 text-xs">
                      {purchaseMutation.error?.response?.data?.detail ||
                        'Failed to purchase ticket. Please try again.'}
                    </div>
                  )}

                  <Button
                    type="submit"
                    variant="primary"
                    size="lg"
                    className="w-full font-bold shadow-lg shadow-brand-600/30"
                    isLoading={purchaseMutation.isPending}
                    disabled={isSoldOut || purchaseMutation.isPending}
                  >
                    <TicketIcon className="w-4 h-4 mr-2" />
                    <span>Purchase Ticket (${applicablePrice.toFixed(2)})</span>
                  </Button>

                  <p className="text-[11px] text-center text-slate-500">
                    Instant confirmation • Cryptographic QR • Recorded in ledger
                  </p>
                </form>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
