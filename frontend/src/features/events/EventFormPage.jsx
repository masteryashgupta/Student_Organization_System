import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Calendar,
  MapPin,
  Users,
  DollarSign,
  FileText,
  Clock,
  ArrowLeft,
  Save,
  AlertCircle,
  CheckCircle2,
  Sparkles,
  ShieldAlert,
  Trash2,
} from 'lucide-react';
import { useAuth } from '../../lib/AuthContext';
import { fetchEventById, createEvent, updateEvent, deleteEvent } from './eventsApi';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';

export default function EventFormPage() {
  const { id } = useParams();
  const isEditMode = Boolean(id);
  const navigate = useNavigate();
  const { isOfficer, isAuthenticated, user } = useAuth();
  const queryClient = useQueryClient();

  // Form Fields State
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    datetime: '',
    venue: '',
    capacity: 100,
    member_price: '0.00',
    nonmember_price: '10.00',
    status: 'published',
  });

  const [formErrors, setFormErrors] = useState({});
  const [serverError, setServerError] = useState(null);

  // Load existing event data if editing
  const { data: existingEvent, isLoading: isEventLoading } = useQuery({
    queryKey: ['event', id],
    queryFn: () => fetchEventById(id),
    enabled: isEditMode && isOfficer,
  });

  // Populate form with existing event data
  useEffect(() => {
    if (existingEvent) {
      // Format ISO string to YYYY-MM-DDTHH:mm for datetime-local input
      let formattedDt = '';
      if (existingEvent.datetime) {
        const dt = new Date(existingEvent.datetime);
        const pad = (n) => String(n).padStart(2, '0');
        formattedDt = `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}T${pad(
          dt.getHours()
        )}:${pad(dt.getMinutes())}`;
      }

      setFormData({
        title: existingEvent.title || '',
        description: existingEvent.description || '',
        datetime: formattedDt,
        venue: existingEvent.venue || '',
        capacity: existingEvent.capacity || 100,
        member_price: existingEvent.member_price ? String(existingEvent.member_price) : '0.00',
        nonmember_price: existingEvent.nonmember_price
          ? String(existingEvent.nonmember_price)
          : '0.00',
        status: existingEvent.status || 'published',
      });
    }
  }, [existingEvent]);

  // Mutations
  const createMutation = useMutation({
    mutationFn: (data) => createEvent(data),
    onSuccess: (newEvent) => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      navigate(`/events/${newEvent.id}`);
    },
    onError: (err) => {
      handleBackendErrors(err);
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data) => updateEvent(id, data),
    onSuccess: (updatedEvent) => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      queryClient.invalidateQueries({ queryKey: ['event', id] });
      queryClient.invalidateQueries({ queryKey: ['event-availability', id] });
      queryClient.invalidateQueries({ queryKey: ['event-stats', id] });
      navigate(`/events/${id}`);
    },
    onError: (err) => {
      handleBackendErrors(err);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteEvent(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      navigate('/events');
    },
  });

  const handleBackendErrors = (err) => {
    const errorData = err.response?.data;
    if (errorData && typeof errorData === 'object') {
      const fieldErrors = {};
      Object.keys(errorData).forEach((key) => {
        const val = errorData[key];
        fieldErrors[key] = Array.isArray(val) ? val.join(' ') : String(val);
      });
      setFormErrors(fieldErrors);
      setServerError('Please fix the highlighted errors below.');
    } else {
      setServerError(err.message || 'An error occurred while saving the event.');
    }
  };

  // Comprehensive Client-Side Validation
  const validateForm = () => {
    const errors = {};

    if (!formData.title.trim()) {
      errors.title = 'Event title is required.';
    } else if (formData.title.trim().length < 3) {
      errors.title = 'Title must be at least 3 characters long.';
    }

    if (!formData.description.trim()) {
      errors.description = 'Please provide an event description.';
    }

    if (!formData.datetime) {
      errors.datetime = 'Event date and time are required.';
    } else if (!isEditMode) {
      const eventTime = new Date(formData.datetime).getTime();
      const now = Date.now();
      if (eventTime <= now) {
        errors.datetime = 'New event date and time must be set in the future.';
      }
    }

    if (!formData.venue.trim()) {
      errors.venue = 'Venue or location is required.';
    }

    const capacityNum = parseInt(formData.capacity, 10);
    if (isNaN(capacityNum) || capacityNum < 1) {
      errors.capacity = 'Capacity must be at least 1 seat.';
    }

    const memberPriceNum = parseFloat(formData.member_price);
    const nonmemberPriceNum = parseFloat(formData.nonmember_price);

    if (isNaN(memberPriceNum) || memberPriceNum < 0) {
      errors.member_price = 'Member price must be greater than or equal to $0.00.';
    }

    if (isNaN(nonmemberPriceNum) || nonmemberPriceNum < 0) {
      errors.nonmember_price = 'Non-member price must be greater than or equal to $0.00.';
    }

    if (!isNaN(memberPriceNum) && !isNaN(nonmemberPriceNum) && memberPriceNum > nonmemberPriceNum) {
      errors.member_price = 'Member price cannot exceed non-member price.';
    }

    return errors;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setServerError(null);

    const validationErrors = validateForm();
    if (Object.keys(validationErrors).length > 0) {
      setFormErrors(validationErrors);
      return;
    }

    setFormErrors({});

    // Payload formatted for Django REST Framework
    const payload = {
      title: formData.title.trim(),
      description: formData.description.trim(),
      datetime: new Date(formData.datetime).toISOString(),
      venue: formData.venue.trim(),
      capacity: parseInt(formData.capacity, 10),
      member_price: parseFloat(formData.member_price).toFixed(2),
      nonmember_price: parseFloat(formData.nonmember_price).toFixed(2),
      status: formData.status,
    };

    if (isEditMode) {
      updateMutation.mutate(payload);
    } else {
      createMutation.mutate(payload);
    }
  };

  const handleDelete = () => {
    if (
      window.confirm(
        `Are you sure you want to delete "${formData.title}"? This action cannot be undone.`
      )
    ) {
      deleteMutation.mutate();
    }
  };

  // Guard: Officers Only
  if (!isAuthenticated || !isOfficer) {
    return (
      <div className="max-w-xl mx-auto py-16 px-4 text-center space-y-6">
        <div className="w-20 h-20 rounded-3xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mx-auto text-amber-400">
          <ShieldAlert className="w-10 h-10" />
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-black text-white">Officer Access Required</h1>
          <p className="text-slate-400 text-sm leading-relaxed">
            Creating or editing events is strictly reserved for club officers (Club Leaders & Admins).
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

  const isSubmitting = createMutation.isPending || updateMutation.isPending;
  const memberSavings =
    parseFloat(formData.nonmember_price || 0) - parseFloat(formData.member_price || 0);

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-20">
      {/* Top Navigation */}
      <div className="flex items-center justify-between">
        <Link
          to={isEditMode ? `/events/${id}` : '/events'}
          className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>{isEditMode ? 'Back to Event Details' : 'Back to Events'}</span>
        </Link>

        {isEditMode && (
          <Button
            variant="danger"
            size="sm"
            onClick={handleDelete}
            disabled={deleteMutation.isPending}
            className="text-xs"
          >
            <Trash2 className="w-3.5 h-3.5 mr-1.5" />
            Delete Event
          </Button>
        )}
      </div>

      {/* Main Form Container */}
      <Card className="bg-surface-900/90 border-slate-800 shadow-2xl overflow-hidden">
        <div className="p-6 sm:p-8 border-b border-slate-800 bg-surface-950/60">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-brand-400 mb-1">
            <Calendar className="w-4 h-4" />
            <span>{isEditMode ? 'Event Management' : 'New Club Gathering'}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            {isEditMode ? 'Edit Event Details' : 'Create New Event'}
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Configure event information, capacity thresholds, and tiered member pricing.
          </p>
        </div>

        <CardContent className="p-6 sm:p-8 space-y-6">
          {serverError && (
            <div className="p-4 rounded-xl bg-rose-950/60 border border-rose-800 text-rose-200 text-xs flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
              <span>{serverError}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Title */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-300 block">
                Event Title *
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="e.g. Annual Skyline Leadership Gala 2026"
                className={`w-full bg-surface-950 border rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:ring-1 ${
                  formErrors.title
                    ? 'border-rose-500 focus:ring-rose-500'
                    : 'border-slate-800 focus:border-brand-500 focus:ring-brand-500'
                }`}
              />
              {formErrors.title && (
                <p className="text-xs text-rose-400 flex items-center gap-1 mt-1">
                  <AlertCircle className="w-3.5 h-3.5" />
                  {formErrors.title}
                </p>
              )}
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-300 block">
                Description & Agenda *
              </label>
              <textarea
                rows={4}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Describe the event, guest speakers, dress code, and what attendees will experience..."
                className={`w-full bg-surface-950 border rounded-xl p-4 text-sm text-white placeholder-slate-600 focus:outline-none focus:ring-1 ${
                  formErrors.description
                    ? 'border-rose-500 focus:ring-rose-500'
                    : 'border-slate-800 focus:border-brand-500 focus:ring-brand-500'
                }`}
              />
              {formErrors.description && (
                <p className="text-xs text-rose-400 flex items-center gap-1 mt-1">
                  <AlertCircle className="w-3.5 h-3.5" />
                  {formErrors.description}
                </p>
              )}
            </div>

            {/* Date/Time and Venue Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {/* Date & Time */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-300 block">
                  Date & Time *
                </label>
                <div className="relative">
                  <input
                    type="datetime-local"
                    value={formData.datetime}
                    onChange={(e) => setFormData({ ...formData, datetime: e.target.value })}
                    className={`w-full bg-surface-950 border rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-1 ${
                      formErrors.datetime
                        ? 'border-rose-500 focus:ring-rose-500'
                        : 'border-slate-800 focus:border-brand-500 focus:ring-brand-500'
                    }`}
                  />
                </div>
                {formErrors.datetime && (
                  <p className="text-xs text-rose-400 flex items-center gap-1 mt-1">
                    <AlertCircle className="w-3.5 h-3.5" />
                    {formErrors.datetime}
                  </p>
                )}
              </div>

              {/* Venue */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-300 block">
                  Venue / Location *
                </label>
                <input
                  type="text"
                  value={formData.venue}
                  onChange={(e) => setFormData({ ...formData, venue: e.target.value })}
                  placeholder="e.g. Skyline Student Center Grand Ballroom"
                  className={`w-full bg-surface-950 border rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:ring-1 ${
                    formErrors.venue
                      ? 'border-rose-500 focus:ring-rose-500'
                      : 'border-slate-800 focus:border-brand-500 focus:ring-brand-500'
                  }`}
                />
                {formErrors.venue && (
                  <p className="text-xs text-rose-400 flex items-center gap-1 mt-1">
                    <AlertCircle className="w-3.5 h-3.5" />
                    {formErrors.venue}
                  </p>
                )}
              </div>
            </div>

            {/* Capacity & Publication Status Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {/* Capacity */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-300 block">
                  Maximum Seating Capacity *
                </label>
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={formData.capacity}
                  onChange={(e) => setFormData({ ...formData, capacity: e.target.value })}
                  className={`w-full bg-surface-950 border rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:ring-1 ${
                    formErrors.capacity
                      ? 'border-rose-500 focus:ring-rose-500'
                      : 'border-slate-800 focus:border-brand-500 focus:ring-brand-500'
                  }`}
                />
                {formErrors.capacity && (
                  <p className="text-xs text-rose-400 flex items-center gap-1 mt-1">
                    <AlertCircle className="w-3.5 h-3.5" />
                    {formErrors.capacity}
                  </p>
                )}
                <span className="text-[11px] text-slate-500 block">
                  Enforces database lock concurrency limit to prevent overselling.
                </span>
              </div>

              {/* Status */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-300 block">
                  Publication Status
                </label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="w-full bg-surface-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-brand-500 font-medium"
                >
                  <option value="draft">Draft (Visible to officers only)</option>
                  <option value="published">Published (Open for ticket purchases)</option>
                  <option value="closed">Closed (Event concluded or sales ended)</option>
                </select>
                <span className="text-[11px] text-slate-500 block">
                  Only 'Published' events appear in the active member ticket directory.
                </span>
              </div>
            </div>

            {/* Tiered Pricing Configuration Callout */}
            <div className="p-6 rounded-2xl bg-surface-950/70 border border-slate-800 space-y-4">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-emerald-400" />
                <h3 className="text-sm font-bold text-white">Tiered Ticket Pricing</h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {/* Member Price */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-emerald-400 block">
                    Club Member Price ($) *
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 text-sm">
                      $
                    </span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.member_price}
                      onChange={(e) => setFormData({ ...formData, member_price: e.target.value })}
                      placeholder="0.00"
                      className={`w-full bg-surface-900 border rounded-xl pl-8 pr-4 py-2.5 text-sm text-white focus:outline-none focus:ring-1 ${
                        formErrors.member_price
                          ? 'border-rose-500 focus:ring-rose-500'
                          : 'border-slate-800 focus:border-emerald-500 focus:ring-emerald-500'
                      }`}
                    />
                  </div>
                  {formErrors.member_price && (
                    <p className="text-xs text-rose-400 flex items-center gap-1 mt-1">
                      <AlertCircle className="w-3.5 h-3.5" />
                      {formErrors.member_price}
                    </p>
                  )}
                  <span className="text-[11px] text-slate-500 block">
                    Rate charged to verified active club members.
                  </span>
                </div>

                {/* Non-Member Price */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-slate-300 block">
                    General Admission / Non-Member ($) *
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 text-sm">
                      $
                    </span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.nonmember_price}
                      onChange={(e) =>
                        setFormData({ ...formData, nonmember_price: e.target.value })
                      }
                      placeholder="10.00"
                      className={`w-full bg-surface-900 border rounded-xl pl-8 pr-4 py-2.5 text-sm text-white focus:outline-none focus:ring-1 ${
                        formErrors.nonmember_price
                          ? 'border-rose-500 focus:ring-rose-500'
                          : 'border-slate-800 focus:border-brand-500 focus:ring-brand-500'
                      }`}
                    />
                  </div>
                  {formErrors.nonmember_price && (
                    <p className="text-xs text-rose-400 flex items-center gap-1 mt-1">
                      <AlertCircle className="w-3.5 h-3.5" />
                      {formErrors.nonmember_price}
                    </p>
                  )}
                  <span className="text-[11px] text-slate-500 block">
                    Standard admission rate for public attendees.
                  </span>
                </div>
              </div>

              {/* Pricing Preview Pill */}
              {memberSavings > 0 && (
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-300 flex items-center justify-between">
                  <span>Membership Incentive:</span>
                  <span className="font-bold">
                    Active club members save ${memberSavings.toFixed(2)} per ticket!
                  </span>
                </div>
              )}
            </div>

            {/* Form Action Buttons */}
            <div className="pt-4 border-t border-slate-800 flex items-center justify-end gap-3">
              <Link to={isEditMode ? `/events/${id}` : '/events'}>
                <Button variant="outline" type="button">
                  Cancel
                </Button>
              </Link>
              <Button variant="primary" type="submit" disabled={isSubmitting}>
                <Save className="w-4 h-4 mr-2" />
                {isSubmitting
                  ? 'Saving Event...'
                  : isEditMode
                  ? 'Update Event'
                  : 'Publish New Event'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
