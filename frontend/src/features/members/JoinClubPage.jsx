import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../lib/AuthContext';
import api from '../../lib/api';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Badge } from '../../components/ui/Badge';
import { useToast } from '../../components/ui/Toast';

export default function JoinClubPage() {
  const navigate = useNavigate();
  const { user, refetchUser } = useAuth();
  const { addToast } = useToast();

  const [tiers, setTiers] = useState([]);
  const [loadingTiers, setLoadingTiers] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    phone: user?.phone || '',
    password: '',
    password_confirm: '',
    tier_id: '',
    pay_now: true,
  });

  // Validation Errors State (Client & Server)
  const [errors, setErrors] = useState({});

  useEffect(() => {
    fetchTiers();
  }, []);

  const fetchTiers = async () => {
    try {
      setLoadingTiers(true);
      const res = await api.get('/membership-tiers');
      const data = res.data.results || res.data || [];
      setTiers(data);
      if (data.length > 0 && !formData.tier_id) {
        // Default to middle or first tier
        const defaultTier = data.find((t) => t.name.includes('Silver')) || data[0];
        setFormData((prev) => ({ ...prev, tier_id: defaultTier.id }));
      }
    } catch (err) {
      console.error('Failed to load membership tiers:', err);
      addToast({
        title: 'Error loading tiers',
        description: 'Could not fetch active membership plans. Please refresh.',
        variant: 'danger',
      });
    } finally {
      setLoadingTiers(false);
    }
  };

  const validateForm = () => {
    const newErrors = {};

    // 1. Name validation
    if (!formData.name.trim()) {
      newErrors.name = 'Full name is required.';
    } else if (formData.name.trim().length < 2) {
      newErrors.name = 'Name must be at least 2 characters.';
    }

    // 2. Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!formData.email.trim()) {
      newErrors.email = 'University / Student email is required.';
    } else if (!emailRegex.test(formData.email.trim())) {
      newErrors.email = 'Please enter a valid email address (e.g. name@skyline.edu).';
    }

    // 3. Phone validation (optional, but if provided check format)
    if (formData.phone.trim()) {
      const phoneClean = formData.phone.replace(/[\s\-\(\)\+]/g, '');
      if (phoneClean.length < 7 || !/^\d+$/.test(phoneClean)) {
        newErrors.phone = 'Please enter a valid phone number.';
      }
    }

    // 4. Password validation (only if user is not already logged in)
    if (!user) {
      if (!formData.password) {
        newErrors.password = 'Password is required.';
      } else if (formData.password.length < 8) {
        newErrors.password = 'Password must be at least 8 characters long.';
      }

      if (!formData.password_confirm) {
        newErrors.password_confirm = 'Please confirm your password.';
      } else if (formData.password !== formData.password_confirm) {
        newErrors.password_confirm = 'Passwords do not match.';
      }
    }

    // 5. Tier selection validation
    if (!formData.tier_id) {
      newErrors.tier_id = 'Please select a membership tier.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      addToast({
        title: 'Validation Error',
        description: 'Please fix the errors in the form before submitting.',
        variant: 'danger',
      });
      return;
    }

    setSubmitting(true);
    setErrors({});

    try {
      if (user) {
        // Already logged in -> Pay dues or activate tier directly
        const res = await api.post('/members/pay-dues', {
          tier_id: parseInt(formData.tier_id),
          payment_method: 'mock_online',
        });
        await refetchUser?.();
        addToast({
          title: 'Membership Activated!',
          description: res.data.message || 'You are now an active Skyline Club member.',
          variant: 'success',
        });
        navigate('/members/profile');
      } else {
        // Public user -> Atomic join endpoint
        const payload = {
          name: formData.name.trim(),
          email: formData.email.trim().toLowerCase(),
          phone: formData.phone.trim(),
          password: formData.password,
          password_confirm: formData.password_confirm,
          tier_id: parseInt(formData.tier_id),
          pay_now: formData.pay_now,
        };

        const res = await api.post('/members/join', payload);
        const { access, refresh } = res.data;

        if (access) {
          localStorage.setItem('access_token', access);
          localStorage.setItem('refresh_token', refresh);
          await refetchUser?.();
        }

        addToast({
          title: 'Welcome to Skyline Club!',
          description: res.data.message || 'Your membership account is ready.',
          variant: 'success',
        });

        navigate('/members/profile');
      }
    } catch (err) {
      console.error('Sign-up failed:', err);
      const serverErrors = err.response?.data || {};

      // Map backend validation errors into field states
      const formattedErrors = {};
      if (typeof serverErrors === 'object') {
        Object.keys(serverErrors).forEach((key) => {
          const val = serverErrors[key];
          formattedErrors[key] = Array.isArray(val) ? val.join(' ') : String(val);
        });
      }

      setErrors(formattedErrors);

      const generalMsg =
        serverErrors.detail ||
        formattedErrors.email ||
        formattedErrors.password ||
        formattedErrors.non_field_errors ||
        'Failed to process membership registration. Please try again.';

      addToast({
        title: 'Registration Error',
        description: generalMsg,
        variant: 'danger',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const selectedTier = tiers.find((t) => String(t.id) === String(formData.tier_id));

  return (
    <div className="max-w-4xl mx-auto space-y-8 py-4 pb-16 animate-fadeIn">
      {/* Hero Header */}
      <div className="text-center space-y-3 max-w-2xl mx-auto">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-500/20 text-[#714B67] dark:text-purple-300 text-xs font-bold uppercase tracking-wider shadow-sm">
          <span className="w-2 h-2 rounded-full bg-[#714B67] dark:bg-purple-400 animate-pulse"></span>
          2026–2027 Academic Season
        </div>
        <h1 className="text-3xl sm:text-5xl font-extrabold text-slate-900 dark:text-white tracking-tight">
          Join the Skyline Student Association
        </h1>
        <p className="text-base text-slate-600 dark:text-slate-300 leading-relaxed">
          Get official voting rights, priority access to campus workshops, merchandise discounts, and exclusive event passes.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Tier Selection Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2.5">
              <span className="w-7 h-7 rounded-full bg-gradient-to-tr from-[#714B67] to-[#8C5D80] text-white text-xs flex items-center justify-center font-bold shadow-md shadow-purple-500/20">1</span>
              Choose Your Membership Plan
            </h2>
            {errors.tier_id && <p className="text-xs text-rose-500 font-semibold">{errors.tier_id}</p>}
          </div>

          {loadingTiers ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-52 glass-card bg-slate-100/50 dark:bg-slate-800/40 rounded-3xl animate-pulse border border-slate-200/60 dark:border-slate-800/60" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {tiers.map((tier) => {
                const isSelected = String(formData.tier_id) === String(tier.id);
                return (
                  <div
                    key={tier.id}
                    onClick={() => {
                      setFormData({ ...formData, tier_id: tier.id });
                      if (errors.tier_id) setErrors({ ...errors, tier_id: null });
                    }}
                    className={`relative rounded-3xl p-6 cursor-pointer border-2 transition-all duration-300 flex flex-col justify-between backdrop-blur-xl ${
                      isSelected
                        ? 'bg-purple-500/10 dark:bg-purple-500/20 border-[#714B67] dark:border-purple-400 shadow-xl shadow-purple-500/10 -translate-y-1.5'
                        : 'glass-card bg-white/70 dark:bg-slate-900/60 border-slate-200/80 dark:border-slate-800/80 hover:border-purple-300 dark:hover:border-purple-700 hover:shadow-lg'
                    }`}
                  >
                    {isSelected && (
                      <div className="absolute top-4 right-4 text-[#714B67] dark:text-purple-300">
                        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                      </div>
                    )}

                    <div>
                      <Badge variant={isSelected ? 'primary' : 'neutral'} size="sm" className="rounded-full px-3 py-0.5">
                        {tier.duration_days} Days Access
                      </Badge>
                      <h3 className="text-xl font-extrabold text-slate-900 dark:text-white mt-3">{tier.name}</h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">{tier.description}</p>
                    </div>

                    <div className="mt-6 pt-4 border-t border-slate-200/60 dark:border-slate-800/60">
                      <div className="flex items-baseline gap-1">
                        <span className="text-3xl font-black text-slate-900 dark:text-white">${tier.price}</span>
                        <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">/ term</span>
                      </div>

                      <div className="mt-4 space-y-2 text-xs text-slate-600 dark:text-slate-300">
                        <div className="flex items-center gap-2">
                          <span className="p-1 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 shrink-0">
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
                            </svg>
                          </span>
                          <span className="font-medium">{tier.ticket_discount_pct}% Event Ticket Discount</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="p-1 rounded-full bg-purple-500/20 text-purple-600 dark:text-purple-400 shrink-0">
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
                            </svg>
                          </span>
                          <span className="font-medium">{tier.merch_discount_pct}% Merch Store Discount</span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Member Profile Details Section */}
        <Card className="glass-panel border-white/40 dark:border-slate-800/80 rounded-3xl shadow-xl overflow-hidden">
          <CardHeader className="p-6 sm:p-8 pb-4">
            <CardTitle className="text-xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2.5">
              <span className="w-7 h-7 rounded-full bg-gradient-to-tr from-[#714B67] to-[#8C5D80] text-white text-xs flex items-center justify-center font-bold shadow-md shadow-purple-500/20">2</span>
              Student & Contact Information
            </CardTitle>
            <CardDescription className="text-xs text-slate-500 dark:text-slate-400">
              Your credentials for club event check-ins and member discounts.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6 sm:p-8 pt-0 space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Full Name *"
                placeholder="e.g. Jordan Lee"
                value={formData.name}
                onChange={(e) => {
                  setFormData({ ...formData, name: e.target.value });
                  if (errors.name) setErrors({ ...errors, name: null });
                }}
                error={errors.name}
                disabled={Boolean(user)}
              />

              <Input
                label="University Email *"
                type="email"
                placeholder="e.g. j.lee@skyline.edu"
                value={formData.email}
                onChange={(e) => {
                  setFormData({ ...formData, email: e.target.value });
                  if (errors.email) setErrors({ ...errors, email: null });
                }}
                error={errors.email}
                disabled={Boolean(user)}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Phone Number"
                type="tel"
                placeholder="e.g. (555) 019-2831"
                value={formData.phone}
                onChange={(e) => {
                  setFormData({ ...formData, phone: e.target.value });
                  if (errors.phone) setErrors({ ...errors, phone: null });
                }}
                error={errors.phone}
                helperText="Optional, used for emergency broadcast SMS alerts."
              />

              {!user && (
                <div className="space-y-1.5">
                  <Input
                    label="Account Password *"
                    type="password"
                    placeholder="At least 8 characters"
                    value={formData.password}
                    onChange={(e) => {
                      setFormData({ ...formData, password: e.target.value });
                      if (errors.password) setErrors({ ...errors, password: null });
                    }}
                    error={errors.password}
                  />
                </div>
              )}
            </div>

            {!user && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Confirm Password *"
                  type="password"
                  placeholder="Re-enter your password"
                  value={formData.password_confirm}
                  onChange={(e) => {
                    setFormData({ ...formData, password_confirm: e.target.value });
                    if (errors.password_confirm) setErrors({ ...errors, password_confirm: null });
                  }}
                  error={errors.password_confirm}
                />
              </div>
            )}

            {/* Dues Payment Mode Selection */}
            <div className="pt-4 border-t border-slate-200/60 dark:border-slate-800/60">
              <label className="text-sm font-bold text-slate-900 dark:text-white block mb-3">
                Dues Payment Options
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <label
                  onClick={() => setFormData({ ...formData, pay_now: true })}
                  className={`p-4 rounded-2xl border-2 cursor-pointer flex items-center gap-3.5 transition-all backdrop-blur-xl ${
                    formData.pay_now
                      ? 'bg-emerald-500/10 border-emerald-500/80 text-emerald-950 dark:text-emerald-200 shadow-md shadow-emerald-500/10'
                      : 'glass-card bg-slate-50/50 dark:bg-slate-800/40 border-slate-200/80 dark:border-slate-700/80 text-slate-500 dark:text-slate-400 hover:border-emerald-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="pay_mode"
                    checked={formData.pay_now}
                    onChange={() => setFormData({ ...formData, pay_now: true })}
                    className="accent-emerald-600 h-4 w-4"
                  />
                  <div>
                    <p className="text-sm font-bold text-slate-900 dark:text-white">Pay & Activate Instantly</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Activates discount perks immediately and records in club ledger.</p>
                  </div>
                </label>

                <label
                  onClick={() => setFormData({ ...formData, pay_now: false })}
                  className={`p-4 rounded-2xl border-2 cursor-pointer flex items-center gap-3.5 transition-all backdrop-blur-xl ${
                    !formData.pay_now
                      ? 'bg-amber-500/10 border-amber-500/80 text-amber-950 dark:text-amber-200 shadow-md shadow-amber-500/10'
                      : 'glass-card bg-slate-50/50 dark:bg-slate-800/40 border-slate-200/80 dark:border-slate-700/80 text-slate-500 dark:text-slate-400 hover:border-amber-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="pay_mode"
                    checked={!formData.pay_now}
                    onChange={() => setFormData({ ...formData, pay_now: false })}
                    className="accent-amber-600 h-4 w-4"
                  />
                  <div>
                    <p className="text-sm font-bold text-slate-900 dark:text-white">Pay Later (Cash / Door)</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Create pending membership and pay dues during your first club meeting.</p>
                  </div>
                </label>
              </div>
            </div>
          </CardContent>

          <CardFooter className="bg-slate-50/50 dark:bg-slate-900/50 border-t border-slate-200/60 dark:border-slate-800/60 p-6 sm:p-8 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-xs text-slate-500 dark:text-slate-400 text-center sm:text-left">
              By joining, you agree to abide by the Skyline Club constitution & community bylaws.
            </div>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              disabled={submitting}
              className="w-full sm:w-auto px-10 py-3.5 font-bold rounded-full bg-gradient-to-r from-[#714B67] to-[#8C5D80] hover:from-[#5B3B52] hover:to-[#714B67] text-white shadow-lg shadow-purple-500/20 active:scale-95 transition-transform"
            >
              {submitting ? (
                'Processing Registration...'
              ) : selectedTier ? (
                formData.pay_now ? `Join & Pay $${selectedTier.price}` : 'Create Membership Account'
              ) : (
                'Select a Plan to Continue'
              )}
            </Button>
          </CardFooter>
        </Card>
      </form>

      {!user && (
        <div className="text-center text-sm text-slate-500 dark:text-slate-400">
          Already have an account?{' '}
          <Link to="/login" className="text-[#714B67] dark:text-purple-400 hover:underline font-bold">
            Sign in here
          </Link>
        </div>
      )}
    </div>
  );
}
