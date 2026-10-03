import React, { useState } from 'react';
import { useAuth } from '../../lib/AuthContext';
import api from '../../lib/api';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { useToast } from '../../components/ui/Toast';

export default function VerifyMemberPage() {
  const { isOfficer } = useAuth();
  const { addToast } = useToast();

  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);
  const [recentChecks, setRecentChecks] = useState([]);

  // Gate officer-only access
  if (!isOfficer) {
    return (
      <div className="max-w-2xl mx-auto py-12">
        <Card className="border-rose-900/40 bg-surface-900/80">
          <CardContent className="p-8 text-center space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-rose-950/80 border border-rose-800 text-rose-400 mx-auto flex items-center justify-center">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-white">Officer Access Required</h2>
            <p className="text-slate-400 text-sm max-w-md mx-auto">
              The Member Verification tool is restricted to club officers, leaders, and administrators for door check-ins and event admissions.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const handleSearch = async (e) => {
    if (e) e.preventDefault();
    const cleanQuery = query.trim();
    if (!cleanQuery) {
      setErrorMsg('Please enter a student email, member ID, or scan a QR token.');
      return;
    }

    setLoading(true);
    setErrorMsg(null);

    try {
      const response = await api.get(`/members/verify?query=${encodeURIComponent(cleanQuery)}`);
      const data = response.data;
      setResult(data);

      // Add to recent door check log
      const checkRecord = {
        id: Date.now(),
        name: data.name || data.email,
        email: data.email,
        tier: data.tier || 'None',
        isActive: data.is_active_member,
        status: data.status,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      };
      setRecentChecks((prev) => [checkRecord, ...prev.slice(0, 9)]);

      if (data.is_active_member) {
        addToast({
          title: 'Member Verified',
          description: `${data.name} has an active ${data.tier} membership.`,
          variant: 'success',
        });
      } else {
        addToast({
          title: 'Membership Not Active',
          description: data.message || `Status: ${data.status_display}`,
          variant: 'warning',
        });
      }
    } catch (err) {
      setResult(null);
      const detail = err.response?.data?.detail || 'No matching member or student found in the system.';
      setErrorMsg(detail);
      addToast({
        title: 'Verification Failed',
        description: detail,
        variant: 'danger',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleClear = () => {
    setQuery('');
    setResult(null);
    setErrorMsg(null);
  };

  const handleQuickLookup = (lookupQuery) => {
    setQuery(lookupQuery);
    setTimeout(() => {
      const form = document.getElementById('verify-search-form');
      if (form) form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
    }, 50);
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-12">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800/80 pb-6">
        <div>
          <div className="flex items-center gap-3">
            <span className="p-2.5 rounded-xl bg-brand-500/10 text-brand-400 border border-brand-500/20">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </span>
            <div>
              <h1 className="text-2xl font-bold text-white tracking-tight">Door Member Verification</h1>
              <p className="text-sm text-slate-400">
                Instant digital lookup for event entry, voting eligibility, and door admission.
              </p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="primary" size="lg" className="px-3.5 py-1.5 font-medium">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse mr-2 inline-block"></span>
            Door Scanner Active
          </Badge>
        </div>
      </div>

      {/* Search Input Card */}
      <Card className="bg-surface-900/90 border-slate-700/80 shadow-2xl">
        <CardContent className="p-6">
          <form id="verify-search-form" onSubmit={handleSearch} className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-3 items-stretch">
              <div className="flex-1 relative">
                <Input
                  id="door-verify-input"
                  placeholder="Scan QR token or type email / Member ID (e.g. jordan@skyline.edu)..."
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    if (errorMsg) setErrorMsg(null);
                  }}
                  autoFocus
                  className="w-full text-base py-3 bg-surface-950/80 border-slate-700 text-white placeholder-slate-500 rounded-xl focus:ring-2 focus:ring-brand-500"
                />
                {query && (
                  <button
                    type="button"
                    onClick={handleClear}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-1 rounded-md"
                    title="Clear input"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
              <Button
                type="submit"
                variant="primary"
                size="lg"
                disabled={loading || !query.trim()}
                className="px-6 py-3 font-semibold shadow-lg shadow-brand-600/30 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Verifying...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    Verify Member
                  </>
                )}
              </Button>
            </div>

            {/* Quick tips & Scanner helper */}
            <div className="flex flex-wrap items-center justify-between text-xs text-slate-400 gap-2 pt-1">
              <span className="flex items-center gap-1.5">
                <kbd className="px-2 py-0.5 rounded bg-surface-800 border border-slate-700 font-mono text-[11px] text-slate-300">Enter</kbd>
                to verify instantly from hardware barcode/QR scanner or keyboard
              </span>
              {result && (
                <button
                  type="button"
                  onClick={handleClear}
                  className="text-brand-400 hover:text-brand-300 hover:underline font-medium"
                >
                  Verify Another Student
                </button>
              )}
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Error / Not Found Display */}
      {errorMsg && (
        <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-800/60 text-rose-300 flex items-start gap-3.5 animate-fadeIn">
          <svg className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div className="flex-1">
            <h4 className="font-semibold text-rose-200 text-sm">Verification Not Found</h4>
            <p className="text-xs text-rose-300/90 mt-0.5">{errorMsg}</p>
            <p className="text-xs text-rose-400/80 mt-2">
              Tip: Confirm the student's registered university email, member ID, or have them open their digital QR pass.
            </p>
          </div>
        </div>
      )}

      {/* Verification Result Section */}
      {result && (
        <div className="space-y-6 animate-fadeIn">
          {/* Main Status Hero Banner */}
          <div
            className={`p-6 rounded-2xl border flex flex-col md:flex-row items-center justify-between gap-6 shadow-2xl ${
              result.is_active_member
                ? 'bg-gradient-to-r from-emerald-950/90 via-emerald-900/60 to-surface-900 border-emerald-500/50 text-emerald-200'
                : result.status === 'expired'
                ? 'bg-gradient-to-r from-rose-950/90 via-rose-900/60 to-surface-900 border-rose-500/50 text-rose-200'
                : result.status === 'pending'
                ? 'bg-gradient-to-r from-amber-950/90 via-amber-900/60 to-surface-900 border-amber-500/50 text-amber-200'
                : 'bg-gradient-to-r from-slate-900 via-slate-800/80 to-surface-900 border-slate-700 text-slate-300'
            }`}
          >
            <div className="flex items-center gap-5 text-center md:text-left">
              <div
                className={`w-16 h-16 rounded-2xl flex items-center justify-center shrink-0 shadow-lg ${
                  result.is_active_member
                    ? 'bg-emerald-500 text-emerald-950'
                    : result.status === 'expired'
                    ? 'bg-rose-500 text-rose-950'
                    : result.status === 'pending'
                    ? 'bg-amber-500 text-amber-950'
                    : 'bg-slate-700 text-white'
                }`}
              >
                {result.is_active_member ? (
                  <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
                  </svg>
                ) : result.status === 'expired' ? (
                  <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                ) : (
                  <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                )}
              </div>
              <div>
                <div className="flex flex-wrap items-center justify-center md:justify-start gap-2.5">
                  <span
                    className={`text-xs font-bold tracking-widest uppercase px-3 py-1 rounded-full border ${
                      result.is_active_member
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                        : result.status === 'expired'
                        ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                        : result.status === 'pending'
                        ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                        : 'bg-slate-800 text-slate-300 border-slate-700'
                    }`}
                  >
                    {result.is_active_member
                      ? 'ACTIVE MEMBER'
                      : result.status === 'expired'
                      ? 'EXPIRED MEMBERSHIP'
                      : result.status === 'pending'
                      ? 'PENDING DUES PAYMENT'
                      : 'NO ACTIVE MEMBERSHIP'}
                  </span>
                  {result.tier && (
                    <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-surface-800/80 text-brand-300 border border-brand-500/30">
                      {result.tier}
                    </span>
                  )}
                </div>
                <h3 className="text-2xl font-bold text-white mt-1.5">{result.name || result.email}</h3>
                <p className="text-sm text-slate-300">{result.email}</p>
              </div>
            </div>

            <div className="flex flex-col items-center md:items-end gap-1.5 shrink-0">
              {result.is_active_member ? (
                <div className="text-right">
                  <div className="text-sm font-semibold text-emerald-300">
                    {result.days_until_expiry} Days Remaining
                  </div>
                  <div className="text-xs text-slate-400">
                    Expires on: {result.expires_on ? new Date(result.expires_on).toLocaleDateString() : 'N/A'}
                  </div>
                </div>
              ) : (
                <div className="text-right">
                  <div className="text-sm font-semibold text-rose-300">Door Action Required</div>
                  <div className="text-xs text-slate-400">{result.message}</div>
                </div>
              )}
            </div>
          </div>

          {/* Details Grid: Left Card Profile & Perks, Right Card Digital Pass & QR */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* 2 Cols: Member Profile & Discounts */}
            <div className="md:col-span-2 space-y-6">
              <Card className="bg-surface-900 border-slate-800">
                <CardHeader>
                  <CardTitle className="text-base flex items-center justify-between">
                    <span>Membership & Account Verification</span>
                    <Badge variant="neutral">User ID #{result.user_id}</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    <div className="p-3.5 rounded-xl bg-surface-950/60 border border-slate-800">
                      <p className="text-xs text-slate-400 font-medium">Account Role</p>
                      <p className="text-sm font-semibold text-white mt-0.5 capitalize">{result.role}</p>
                    </div>
                    <div className="p-3.5 rounded-xl bg-surface-950/60 border border-slate-800">
                      <p className="text-xs text-slate-400 font-medium">Membership Tier</p>
                      <p className="text-sm font-semibold text-brand-300 mt-0.5">{result.tier || 'None'}</p>
                    </div>
                    <div className="p-3.5 rounded-xl bg-surface-950/60 border border-slate-800">
                      <p className="text-xs text-slate-400 font-medium">Dues Payment</p>
                      <p className={`text-sm font-semibold mt-0.5 ${result.dues_paid ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {result.dues_paid ? 'Paid & Recorded' : 'Unpaid'}
                      </p>
                    </div>
                    <div className="p-3.5 rounded-xl bg-surface-950/60 border border-slate-800">
                      <p className="text-xs text-slate-400 font-medium">Start Date</p>
                      <p className="text-sm font-semibold text-slate-200 mt-0.5">
                        {result.start_date ? new Date(result.start_date).toLocaleDateString() : '—'}
                      </p>
                    </div>
                    <div className="p-3.5 rounded-xl bg-surface-950/60 border border-slate-800">
                      <p className="text-xs text-slate-400 font-medium">Expiry Date</p>
                      <p className="text-sm font-semibold text-slate-200 mt-0.5">
                        {result.expires_on ? new Date(result.expires_on).toLocaleDateString() : '—'}
                      </p>
                    </div>
                    <div className="p-3.5 rounded-xl bg-surface-950/60 border border-slate-800">
                      <p className="text-xs text-slate-400 font-medium">Member ID</p>
                      <p className="text-sm font-semibold text-slate-200 mt-0.5">
                        {result.member_id ? `#${result.member_id}` : 'No Record'}
                      </p>
                    </div>
                  </div>

                  {/* Club Perks Matrix */}
                  <div className="pt-2">
                    <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2.5">
                      Applicable Club Perks & Discounts
                    </h4>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="p-3.5 rounded-xl bg-brand-950/30 border border-brand-800/40 flex items-center justify-between">
                        <div>
                          <p className="text-xs text-brand-300 font-medium">Ticket Discount</p>
                          <p className="text-lg font-bold text-white">{result.ticket_discount_pct}% OFF</p>
                        </div>
                        <span className="p-2 rounded-lg bg-brand-900/60 text-brand-300">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
                          </svg>
                        </span>
                      </div>
                      <div className="p-3.5 rounded-xl bg-accent-950/30 border border-accent-800/40 flex items-center justify-between">
                        <div>
                          <p className="text-xs text-accent-300 font-medium">Merch Store Discount</p>
                          <p className="text-lg font-bold text-white">{result.merch_discount_pct}% OFF</p>
                        </div>
                        <span className="p-2 rounded-lg bg-accent-900/60 text-accent-300">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                          </svg>
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* 1 Col: Member Digital Pass & QR Code */}
            <div className="space-y-6">
              <Card className="bg-gradient-to-b from-surface-900 to-surface-950 border-slate-700/80 shadow-xl text-center">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold text-slate-300">
                    Digital Verification Pass
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Scan via QR or optical badge reader
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-5 flex flex-col items-center space-y-4">
                  {result.qr_code ? (
                    <div className="p-3 bg-white rounded-2xl shadow-xl inline-block border-2 border-slate-700">
                      <img
                        src={result.qr_code}
                        alt="Member Verification QR Code"
                        className="w-40 h-40 object-contain mx-auto"
                      />
                    </div>
                  ) : (
                    <div className="w-40 h-40 rounded-2xl bg-surface-800 border border-slate-700 flex flex-col items-center justify-center p-4 text-slate-500 text-xs">
                      <svg className="w-8 h-8 mb-2 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                      </svg>
                      No QR Token Generated
                    </div>
                  )}

                  {result.token && (
                    <div className="w-full">
                      <p className="text-[11px] text-slate-500 font-mono truncate bg-surface-950 px-2 py-1.5 rounded-lg border border-slate-800">
                        Token: {result.token}
                      </p>
                    </div>
                  )}

                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full text-xs"
                    onClick={handleClear}
                  >
                    Scan Next Student
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      )}

      {/* Door Verification Session History Log */}
      {recentChecks.length > 0 && (
        <Card className="bg-surface-900/60 border-slate-800">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Door Session Activity Log
              </CardTitle>
              <span className="text-xs text-slate-400">{recentChecks.length} recent checks</span>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-slate-800/80 overflow-x-auto">
              {recentChecks.map((item) => (
                <div
                  key={item.id}
                  onClick={() => handleQuickLookup(item.email)}
                  className="px-5 py-3.5 flex items-center justify-between hover:bg-slate-800/40 cursor-pointer transition-colors text-sm"
                  title="Click to re-verify"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-2.5 h-2.5 rounded-full ${
                        item.isActive ? 'bg-emerald-400 shadow-sm shadow-emerald-500/50' : 'bg-rose-500'
                      }`}
                    ></div>
                    <div>
                      <p className="font-semibold text-white">{item.name}</p>
                      <p className="text-xs text-slate-400">{item.email}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <span className="text-xs text-slate-400 hidden sm:inline-block">{item.tier}</span>
                    <Badge variant={item.isActive ? 'success' : 'danger'} size="sm">
                      {item.isActive ? 'ACTIVE' : item.status.toUpperCase()}
                    </Badge>
                    <span className="text-xs font-mono text-slate-500">{item.timestamp}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
