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
      <div className="relative w-full max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
        {/* LEFT: Brand & Feature Highlights Panel */}
        <div className="lg:col-span-6 space-y-6 text-left">
          <div className="dual-badge-pill">
            <Sparkles className="w-3.5 h-3.5 text-[#714B67] dark:text-[#F3EAF2]" />
            <span>Campus Organization OS</span>
          </div>

          <div className="space-y-3">
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-slate-900 dark:text-white tracking-tight leading-[1.15]">
              One platform for your <span className="text-[#714B67] dark:text-[#A97B9F]">campus community</span>.
            </h1>
            <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 max-w-lg leading-relaxed">
              Discover events, connect with members, volunteer for real projects, and manage organization activities with ease.
            </p>
          </div>

          {/* Feature Highlights with Glass Styling */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-2">
            <div className="flex items-start gap-3 p-4 rounded-3xl bg-white/70 dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200/80 dark:border-white/10 shadow-xs hover:border-[#D4BFD2] dark:hover:border-white/20 transition-all">
              <div className="w-9 h-9 rounded-2xl bg-[#F3EAF2] dark:bg-[#714B67]/30 text-[#714B67] dark:text-[#F3EAF2] flex items-center justify-center shrink-0 shadow-xs">
                <Calendar className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-900 dark:text-white">Campus Events</h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Workshops, meetups & RSVP</p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-4 rounded-3xl bg-white/70 dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200/80 dark:border-white/10 shadow-xs hover:border-[#D4BFD2] dark:hover:border-white/20 transition-all">
              <div className="w-9 h-9 rounded-2xl bg-[#F3EAF2] dark:bg-[#714B67]/30 text-[#714B67] dark:text-[#F3EAF2] flex items-center justify-center shrink-0 shadow-xs">
                <Users className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-900 dark:text-white">Member Hub</h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Directory & dues portal</p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-4 rounded-3xl bg-white/70 dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200/80 dark:border-white/10 shadow-xs hover:border-[#D4BFD2] dark:hover:border-white/20 transition-all">
              <div className="w-9 h-9 rounded-2xl bg-[#F3EAF2] dark:bg-[#714B67]/30 text-[#714B67] dark:text-[#F3EAF2] flex items-center justify-center shrink-0 shadow-xs">
                <ShoppingBag className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-900 dark:text-white">Official Store</h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Club apparel & merch</p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-4 rounded-3xl bg-white/70 dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200/80 dark:border-white/10 shadow-xs hover:border-[#D4BFD2] dark:hover:border-white/20 transition-all">
              <div className="w-9 h-9 rounded-2xl bg-[#F3EAF2] dark:bg-[#714B67]/30 text-[#714B67] dark:text-[#F3EAF2] flex items-center justify-center shrink-0 shadow-xs">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-900 dark:text-white">Action Board</h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Volunteer task tracking</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs font-medium text-slate-500 dark:text-slate-400 pt-1">
            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
            <span>Trusted by student leaders and members across Skyline Campus</span>
          </div>
        </div>

        {/* RIGHT: Login Glass Card Panel */}
        <div className="lg:col-span-6 flex justify-center lg:justify-end">
          <div className="w-full max-w-[450px] bg-white/85 dark:bg-slate-900/80 backdrop-blur-2xl rounded-3xl border border-slate-200/80 dark:border-white/10 shadow-2xl p-7 sm:p-9">
            <div className="text-center pb-6">
              <div className="mx-auto w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#714B67] to-[#87567D] flex items-center justify-center font-extrabold text-white text-xl shadow-md mb-3.5">
                S
              </div>
              <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">Welcome Back</h2>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
                Sign in to access your Skyline Club account
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="p-3.5 rounded-2xl bg-rose-50/90 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/50 text-rose-700 dark:text-rose-300 text-xs font-medium">
                  {error}
                </div>
              )}

              <div className="space-y-1.5 text-left">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Email or Username
                </label>
                <input
                  type="text"
                  placeholder="student@skyline.edu"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  className="block w-full rounded-2xl bg-white/80 dark:bg-slate-900/70 backdrop-blur-md border border-slate-200/80 dark:border-white/10 px-4 py-2.5 text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-[#714B67] dark:focus:border-[#A97B9F] focus:ring-4 focus:ring-[#714B67]/20 dark:focus:ring-[#A97B9F]/20 transition-all shadow-xs"
                />
              </div>

              <div className="space-y-1.5 text-left">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
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
                    className="block w-full rounded-2xl bg-white/80 dark:bg-slate-900/70 backdrop-blur-md border border-slate-200/80 dark:border-white/10 pl-4 pr-11 py-2.5 text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-[#714B67] dark:focus:border-[#A97B9F] focus:ring-4 focus:ring-[#714B67]/20 dark:focus:ring-[#A97B9F]/20 transition-all shadow-xs"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
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
                className="w-full mt-2 font-bold shadow-lg"
              >
                <span>Sign In</span>
                {!loading && <ArrowRight className="w-4 h-4 ml-1.5" />}
              </Button>
            </form>

            <div className="mt-6 pt-5 border-t border-slate-100 dark:border-white/5 text-center text-xs text-slate-500 dark:text-slate-400">
              Don't have an account?{' '}
              <Link
                to="/register"
                className="text-[#714B67] dark:text-[#A97B9F] font-bold hover:underline transition-colors ml-1"
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

