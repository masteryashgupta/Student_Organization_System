import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../lib/AuthContext';
import { useToast } from '../../components/ui/Toast';
import { Button } from '../../components/ui/Button';
import { Select } from '../../components/ui/Select';
import {
  Eye,
  EyeOff,
  CheckCircle2,
  Sparkles,
  Award,
  Users,
  ShieldCheck,
  ArrowRight,
} from 'lucide-react';

export default function RegisterPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    password_confirm: '',
    role: 'public',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const { register, login } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const validate = () => {
    const errs = {};
    if (!formData.name.trim()) errs.name = 'Full name is required';
    if (!formData.email.trim() || !formData.email.includes('@'))
      errs.email = 'Valid email is required';
    if (formData.password.length < 8)
      errs.password = 'Password must be at least 8 characters';
    if (formData.password !== formData.password_confirm)
      errs.password_confirm = 'Passwords do not match';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      await register({
        ...formData,
        username: formData.email,
      });
      toast.success('Account created successfully!');
      try {
        await login(formData.email, formData.password);
        navigate('/');
      } catch {
        navigate('/login');
      }
    } catch (err) {
      const respData = err.response?.data;
      if (respData?.details && typeof respData.details === 'object') {
        const fieldErrors = {};
        Object.entries(respData.details).forEach(([key, val]) => {
          fieldErrors[key] = Array.isArray(val) ? val.join(' ') : String(val);
        });
        setErrors(fieldErrors);
        const firstErrorMsg = Object.values(fieldErrors)[0];
        toast.error(firstErrorMsg || respData?.message || 'Registration failed.');
      } else {
        const msg =
          respData?.message ||
          respData?.detail ||
          (!err.response
            ? 'Cannot connect to backend server. Please start Django on http://localhost:8000.'
            : 'Registration failed. Please try again.');
        toast.error(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-[calc(100vh-140px)] flex items-center justify-center py-6 sm:py-12 px-4 sm:px-6 lg:px-8">
      <div className="relative w-full max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
        {/* LEFT: Brand & Value Proposition */}
        <div className="lg:col-span-5 space-y-6 text-left">
          <div className="dual-badge-pill">
            <Sparkles className="w-3.5 h-3.5 text-[#714B67] dark:text-[#F3EAF2]" />
            <span>Join the Community</span>
          </div>

          <div className="space-y-3">
            <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight leading-[1.15]">
              Unlock full access to <span className="text-[#714B67] dark:text-[#A97B9F]">Skyline Club</span>.
            </h1>
            <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              Create your account in seconds to RSVP for club events, unlock member merchandise discounts, participate in volunteer action items, and access member perks.
            </p>
          </div>

          <div className="space-y-3 pt-2">
            <div className="flex items-start gap-3 p-4 rounded-3xl bg-white/70 dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200/80 dark:border-white/10 shadow-xs hover:border-[#D4BFD2] dark:hover:border-white/20 transition-all">
              <div className="w-9 h-9 rounded-2xl bg-[#F3EAF2] dark:bg-[#714B67]/30 text-[#714B67] dark:text-[#F3EAF2] flex items-center justify-center shrink-0 shadow-xs">
                <Users className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-900 dark:text-white">All Membership Tiers</h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Guest, Regular Member, Volunteer, Leader</p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-4 rounded-3xl bg-white/70 dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200/80 dark:border-white/10 shadow-xs hover:border-[#D4BFD2] dark:hover:border-white/20 transition-all">
              <div className="w-9 h-9 rounded-2xl bg-[#F3EAF2] dark:bg-[#714B67]/30 text-[#714B67] dark:text-[#F3EAF2] flex items-center justify-center shrink-0 shadow-xs">
                <Award className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-900 dark:text-white">Official Membership Badge</h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Manage digital dues and QR event check-ins</p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-4 rounded-3xl bg-white/70 dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200/80 dark:border-white/10 shadow-xs hover:border-[#D4BFD2] dark:hover:border-white/20 transition-all">
              <div className="w-9 h-9 rounded-2xl bg-[#F3EAF2] dark:bg-[#714B67]/30 text-[#714B67] dark:text-[#F3EAF2] flex items-center justify-center shrink-0 shadow-xs">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-900 dark:text-white">Student Governance</h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Budget transparency & reimbursement portals</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs font-medium text-slate-500 dark:text-slate-400">
            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
            <span>Instant sign-up • No upfront fees for guest tier</span>
          </div>
        </div>

        {/* RIGHT: Register Card */}
        <div className="lg:col-span-7 flex justify-center lg:justify-end">
          <div className="w-full max-w-[500px] bg-white/85 dark:bg-slate-900/80 backdrop-blur-2xl rounded-3xl border border-slate-200/80 dark:border-white/10 shadow-2xl p-7 sm:p-9">
            <div className="text-center pb-5">
              <div className="mx-auto w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#714B67] to-[#87567D] flex items-center justify-center font-extrabold text-white text-xl shadow-md mb-2">
                S
              </div>
              <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">Create Account</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Enter your details to join Skyline Student Organization
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3.5">
              <div className="space-y-1 text-left">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Full Name
                </label>
                <input
                  name="name"
                  type="text"
                  placeholder="Jane Doe"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  className="block w-full rounded-2xl bg-white/80 dark:bg-slate-900/70 backdrop-blur-md border border-slate-200/80 dark:border-white/10 px-4 py-2.5 text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-[#714B67] dark:focus:border-[#A97B9F] focus:ring-4 focus:ring-[#714B67]/20 dark:focus:ring-[#A97B9F]/20 transition-all shadow-xs"
                />
                {errors.name && (
                  <p className="text-xs text-rose-600 dark:text-rose-400 font-medium">{errors.name}</p>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1 text-left">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    Email Address
                  </label>
                  <input
                    name="email"
                    type="email"
                    placeholder="student@skyline.edu"
                    value={formData.email}
                    onChange={handleChange}
                    required
                    className="block w-full rounded-2xl bg-white/80 dark:bg-slate-900/70 backdrop-blur-md border border-slate-200/80 dark:border-white/10 px-4 py-2.5 text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-[#714B67] dark:focus:border-[#A97B9F] focus:ring-4 focus:ring-[#714B67]/20 dark:focus:ring-[#A97B9F]/20 transition-all shadow-xs"
                  />
                  {errors.email && (
                    <p className="text-xs text-rose-600 dark:text-rose-400 font-medium">{errors.email}</p>
                  )}
                </div>

                <div className="space-y-1 text-left">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    Phone Number
                  </label>
                  <input
                    name="phone"
                    type="tel"
                    placeholder="(555) 000-1234"
                    value={formData.phone}
                    onChange={handleChange}
                    className="block w-full rounded-2xl bg-white/80 dark:bg-slate-900/70 backdrop-blur-md border border-slate-200/80 dark:border-white/10 px-4 py-2.5 text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-[#714B67] dark:focus:border-[#A97B9F] focus:ring-4 focus:ring-[#714B67]/20 dark:focus:ring-[#A97B9F]/20 transition-all shadow-xs"
                  />
                </div>
              </div>

              <div className="space-y-1 text-left">
                <Select
                  label="Initial Account Role"
                  name="role"
                  value={formData.role}
                  onChange={handleChange}
                  options={[
                    { value: 'public', label: 'Public Student / Guest' },
                    { value: 'member', label: 'Student Member (Pending Dues)' },
                    { value: 'volunteer', label: 'Volunteer' },
                    { value: 'leader', label: 'Club Leader' },
                  ]}
                  helperText="You can activate full membership benefits after completing dues payment."
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1 text-left">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    Password
                  </label>
                  <div className="relative">
                    <input
                      name="password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      value={formData.password}
                      onChange={handleChange}
                      required
                      className="block w-full rounded-2xl bg-white/80 dark:bg-slate-900/70 backdrop-blur-md border border-slate-200/80 dark:border-white/10 pl-4 pr-10 py-2.5 text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-[#714B67] dark:focus:border-[#A97B9F] focus:ring-4 focus:ring-[#714B67]/20 dark:focus:ring-[#A97B9F]/20 transition-all shadow-xs"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {errors.password && (
                    <p className="text-xs text-rose-600 dark:text-rose-400 font-medium">{errors.password}</p>
                  )}
                </div>

                <div className="space-y-1 text-left">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    Confirm Password
                  </label>
                  <div className="relative">
                    <input
                      name="password_confirm"
                      type={showConfirmPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      value={formData.password_confirm}
                      onChange={handleChange}
                      required
                      className="block w-full rounded-2xl bg-white/80 dark:bg-slate-900/70 backdrop-blur-md border border-slate-200/80 dark:border-white/10 pl-4 pr-10 py-2.5 text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-[#714B67] dark:focus:border-[#A97B9F] focus:ring-4 focus:ring-[#714B67]/20 dark:focus:ring-[#A97B9F]/20 transition-all shadow-xs"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                    >
                      {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {errors.password_confirm && (
                    <p className="text-xs text-rose-600 dark:text-rose-400 font-medium">{errors.password_confirm}</p>
                  )}
                </div>
              </div>

              <Button
                type="submit"
                variant="primary"
                size="lg"
                isLoading={loading}
                className="w-full mt-3 font-bold shadow-lg"
              >
                <span>Create Account</span>
                {!loading && <ArrowRight className="w-4 h-4 ml-1.5" />}
              </Button>
            </form>

            <div className="mt-5 pt-4 border-t border-slate-100 dark:border-white/5 text-center text-xs text-slate-500 dark:text-slate-400">
              Already have an account?{' '}
              <Link
                to="/login"
                className="text-[#714B67] dark:text-[#A97B9F] font-bold hover:underline transition-colors ml-1"
              >
                Sign in here
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

