import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../lib/AuthContext';
import { useToast } from '../../components/ui/Toast';
import { Button } from '../../components/ui/Button';
import {
  Eye,
  EyeOff,
  CheckCircle2,
  Sparkles,
  Calendar,
  Users,
  ShoppingBag,
  ShieldCheck,
  ArrowRight,
} from 'lucide-react';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const { login } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username || !password) {
      setError('Please enter both email/username and password.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await login(username, password);
      toast.success('Successfully logged in!');
      navigate('/');
    } catch (err) {
      const msg =
        err.response?.data?.message ||
        err.response?.data?.detail ||
        'Login failed. Please check your credentials.';
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-[calc(100vh-140px)] flex items-center justify-center py-6 sm:py-12 px-4 sm:px-6 lg:px-8">
      {/* Subtle ambient decorative depth in background */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden flex items-center justify-center">
        <div className="w-[500px] h-[500px] bg-[#714B67]/5 rounded-full blur-3xl -top-24 -left-20 animate-pulse duration-1000" />
        <div className="w-[450px] h-[450px] bg-[#714B67]/5 rounded-full blur-3xl -bottom-20 -right-20" />
      </div>

      <div className="relative w-full max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
        {/* LEFT: Brand & Feature Highlights Panel */}
        <div className="lg:col-span-6 space-y-6 text-left">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#F3EAF2] border border-[#D4BFD2] text-[#714B67] text-xs font-bold uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5 text-[#714B67]" />
            <span>Campus Organization OS</span>
          </div>

          <div className="space-y-3">
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-[#0F172A] tracking-tight leading-[1.15]">
              One platform for your <span className="text-[#714B67]">campus community</span>.
            </h1>
            <p className="text-sm sm:text-base text-[#64748B] max-w-lg leading-relaxed">
              Discover events, connect with members, volunteer for real projects, and manage organization activities with ease.
            </p>
          </div>

          {/* Feature Highlights with Brand Styling */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-white/70 border border-slate-200/80 shadow-xs">
              <div className="w-8 h-8 rounded-xl bg-[#F3EAF2] text-[#714B67] flex items-center justify-center shrink-0">
                <Calendar className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-[#0F172A]">Campus Events</h4>
                <p className="text-[11px] text-[#64748B] mt-0.5">Workshops, meetups & RSVP</p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-white/70 border border-slate-200/80 shadow-xs">
              <div className="w-8 h-8 rounded-xl bg-[#F3EAF2] text-[#714B67] flex items-center justify-center shrink-0">
                <Users className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-[#0F172A]">Member Hub</h4>
                <p className="text-[11px] text-[#64748B] mt-0.5">Directory & dues portal</p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-white/70 border border-slate-200/80 shadow-xs">
              <div className="w-8 h-8 rounded-xl bg-[#F3EAF2] text-[#714B67] flex items-center justify-center shrink-0">
                <ShoppingBag className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-[#0F172A]">Official Store</h4>
                <p className="text-[11px] text-[#64748B] mt-0.5">Club apparel & merch</p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-white/70 border border-slate-200/80 shadow-xs">
              <div className="w-8 h-8 rounded-xl bg-[#F3EAF2] text-[#714B67] flex items-center justify-center shrink-0">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-[#0F172A]">Action Board</h4>
                <p className="text-[11px] text-[#64748B] mt-0.5">Volunteer task tracking</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs font-medium text-[#64748B] pt-1">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Trusted by student leaders and members across Skyline Campus</span>
          </div>
        </div>

        {/* RIGHT: Login Card Panel */}
        <div className="lg:col-span-6 flex justify-center lg:justify-end">
          <div className="w-full max-w-[450px] bg-white rounded-3xl border border-slate-200 shadow-xl shadow-[#714B67]/5 p-6 sm:p-8">
            <div className="text-center pb-6">
              <div className="mx-auto w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#714B67] to-[#5B3B52] flex items-center justify-center font-black text-white text-xl shadow-md mb-3">
                S
              </div>
              <h2 className="text-2xl font-black text-[#0F172A] tracking-tight">Welcome Back</h2>
              <p className="text-xs sm:text-sm text-[#64748B] mt-1">
                Sign in to access your Skyline Club account
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
                  {error}
                </div>
              )}

              <div className="space-y-1.5 text-left">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                  Email or Username
                </label>
                <input
                  type="text"
                  placeholder="student@skyline.edu"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  className="block w-full rounded-xl bg-white border border-slate-200 px-3.5 py-2.5 text-sm text-[#0F172A] placeholder-slate-400 focus:outline-none focus:border-[#714B67] focus:ring-2 focus:ring-[#714B67]/20 transition-all shadow-xs"
                />
              </div>

              <div className="space-y-1.5 text-left">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                    Password
                  </label>
                </div>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="block w-full rounded-xl bg-white border border-slate-200 pl-3.5 pr-10 py-2.5 text-sm text-[#0F172A] placeholder-slate-400 focus:outline-none focus:border-[#714B67] focus:ring-2 focus:ring-[#714B67]/20 transition-all shadow-xs"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 transition-colors"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                variant="primary"
                size="lg"
                isLoading={loading}
                className="w-full mt-2 font-bold shadow-md hover:shadow-lg"
              >
                <span>Sign In</span>
                {!loading && <ArrowRight className="w-4 h-4 ml-1.5" />}
              </Button>
            </form>

            <div className="mt-6 pt-5 border-t border-slate-100 text-center text-xs text-[#64748B]">
              Don't have an account?{' '}
              <Link
                to="/register"
                className="text-[#714B67] font-bold hover:text-[#5B3B52] hover:underline transition-colors ml-1"
              >
                Register here
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
