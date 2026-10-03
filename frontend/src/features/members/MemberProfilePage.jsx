import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../lib/AuthContext';
import api from '../../lib/api';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { useToast } from '../../components/ui/Toast';
import { ShieldCheck, Sparkles, Award, QrCode, RefreshCw, CheckCircle2, AlertTriangle, ArrowRight } from 'lucide-react';

export default function MemberProfilePage() {
  const { user, refetchUser } = useAuth();
  const { addToast } = useToast();

  const [profileData, setProfileData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [renewModalOpen, setRenewModalOpen] = useState(false);
  const [selectedTierId, setSelectedTierId] = useState('');
  const [renewing, setRenewing] = useState(false);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const res = await api.get('/members/profile/me');
      setProfileData(res.data);
      if (res.data.membership?.tier) {
        setSelectedTierId(res.data.membership.tier);
      } else if (res.data.available_tiers?.length > 0) {
        setSelectedTierId(res.data.available_tiers[0].id);
      }
    } catch (err) {
      console.error('Failed to load membership profile:', err);
      addToast({
        title: 'Error Loading Profile',
        description: 'Could not fetch your membership details from server.',
        variant: 'danger',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRenew = async () => {
    setRenewing(true);
    try {
      const res = await api.post('/members/pay-dues', {
        tier_id: parseInt(selectedTierId),
        payment_method: 'online_self_renewal',
      });
      await refetchUser?.();
      await fetchProfile();
      setRenewModalOpen(false);
      addToast({
        title: 'Membership Renewed!',
        description: res.data.message || 'Your membership dues have been recorded and benefits activated.',
        variant: 'success',
      });
    } catch (err) {
      console.error('Renewal failed:', err);
      addToast({
        title: 'Renewal Failed',
        description: err.response?.data?.detail || 'Could not process renewal payment.',
        variant: 'danger',
      });
    } finally {
      setRenewing(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto py-16 text-center text-slate-500 dark:text-slate-400 space-y-4">
        <svg className="animate-spin h-8 w-8 text-brand-600 dark:text-brand-400 mx-auto" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        <p className="text-sm font-medium">Loading your membership pass and club perks...</p>
      </div>
    );
  }

  const membership = profileData?.membership;
  const availableTiers = profileData?.available_tiers || [];
  const isActive = membership?.computed_status === 'active' || membership?.status === 'active';
  const isExpiring = membership?.is_expiring_soon;
  const tierDetails = membership?.tier_details;

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-16 animate-fade-in">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 dark:border-white/10 pb-6">
        <div>
          <div className="flex items-center gap-3.5">
            <div className="w-13 h-13 rounded-3xl bg-gradient-to-tr from-brand-600 to-indigo-600 flex items-center justify-center font-extrabold text-white text-xl shadow-md p-3">
              {(user?.name || user?.username || 'U').charAt(0).toUpperCase()}
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                {user?.name || user?.username}
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {user?.email} • Role: <span className="capitalize font-bold text-slate-800 dark:text-slate-200">{user?.role}</span>
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="primary"
            size="md"
            className="font-bold shadow-md gap-2 px-5 py-2.5"
            onClick={() => setRenewModalOpen(true)}
          >
            <RefreshCw className="w-4 h-4" />
            {membership ? (isActive ? 'Renew / Extend Plan' : 'Pay Dues & Activate') : 'Join a Plan'}
          </Button>
        </div>
      </div>

      {/* Main Membership Status Banner */}
      {membership ? (
        <div
          className={`p-6 sm:p-7 rounded-3xl border backdrop-blur-xl flex flex-col md:flex-row items-center justify-between gap-6 shadow-xl ${
            isActive
              ? 'bg-emerald-50/80 dark:bg-emerald-950/30 border-emerald-200/80 dark:border-emerald-800/40 text-emerald-950 dark:text-emerald-100'
              : membership.status === 'expired'
              ? 'bg-rose-50/80 dark:bg-rose-950/30 border-rose-200/80 dark:border-rose-800/40 text-rose-950 dark:text-rose-100'
              : 'bg-amber-50/80 dark:bg-amber-950/30 border-amber-200/80 dark:border-amber-800/40 text-amber-950 dark:text-amber-100'
          }`}
        >
          <div className="flex items-center gap-5 text-center md:text-left">
            <div
              className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 shadow-md ${
                isActive
                  ? 'bg-emerald-600 text-white'
                  : membership.status === 'expired'
                  ? 'bg-rose-600 text-white'
                  : 'bg-amber-600 text-white'
              }`}
            >
              {isActive ? (
                <CheckCircle2 className="w-8 h-8" />
              ) : (
                <AlertTriangle className="w-8 h-8" />
              )}
            </div>

            <div>
              <div className="flex items-center gap-2 justify-center md:justify-start">
                <Badge variant={isActive ? 'success' : membership.status === 'expired' ? 'danger' : 'warning'}>
                  {isActive ? 'Active Member' : membership.status === 'expired' ? 'Expired' : 'Pending Payment'}
                </Badge>
                <span className="text-xs font-bold text-brand-600 dark:text-brand-300">{tierDetails?.name}</span>
              </div>
              <h3 className="text-xl font-extrabold text-slate-900 dark:text-white mt-1">
                {isActive ? 'Your Membership is Active' : membership.status === 'expired' ? 'Membership Expired' : 'Dues Unpaid'}
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">
                {isActive
                  ? `Valid until ${new Date(membership.end_date).toLocaleDateString()} (${membership.days_until_expiry} days remaining)`
                  : 'Pay annual dues to restore discounts and club voting rights.'}
              </p>
            </div>
          </div>

          <div className="text-center md:text-right shrink-0">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setRenewModalOpen(true)}
              className="text-xs font-bold px-4 py-2"
            >
              {isActive ? 'Extend Plan' : 'Pay Dues Now'}
            </Button>
          </div>
        </div>
      ) : (
        <Card className="bg-gradient-to-br from-amber-50/70 via-white/80 to-brand-50/30 dark:from-slate-900 dark:via-slate-900/90 dark:to-brand-950/20 backdrop-blur-xl border border-amber-200/80 dark:border-white/10 p-8 text-center space-y-4 rounded-3xl shadow-xl">
          <div className="w-14 h-14 rounded-2xl bg-amber-100 dark:bg-amber-900/50 text-amber-800 dark:text-amber-300 mx-auto flex items-center justify-center shadow-xs">
            <Sparkles className="w-7 h-7 text-amber-600 dark:text-amber-400" />
          </div>
          <div className="space-y-1">
            <h3 className="text-xl font-extrabold text-slate-900 dark:text-white">No Active Membership Tier Enrolled</h3>
            <p className="text-sm text-slate-600 dark:text-slate-300 max-w-lg mx-auto leading-relaxed">
              You are currently registered as a public student. Join a membership tier to unlock ticket discounts, merch savings, and club voting rights.
            </p>
          </div>
          <div className="pt-2">
            <Button
              variant="primary"
              size="md"
              className="font-bold px-6 py-2.5 shadow-md"
              onClick={() => setRenewModalOpen(true)}
            >
              Choose a Membership Tier
            </Button>
          </div>
        </Card>
      )}

      {/* Grid: Benefits & Discounts + Digital Membership Pass */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left 2 Cols: Benefits & Discounts */}
        <div className="md:col-span-2 space-y-6">
          <Card className="bg-white/80 dark:bg-slate-900/70 backdrop-blur-xl border-slate-200/80 dark:border-white/10 shadow-xl rounded-3xl">
            <CardHeader className="border-b border-slate-100/80 dark:border-white/5">
              <CardTitle className="text-base sm:text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-brand-600 dark:text-brand-400" />
                Active Club Benefits &amp; Discounts
              </CardTitle>
              <CardDescription className="text-xs text-slate-500 dark:text-slate-400">
                Discounts automatically applied across Event Ticketing and Merch Store.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5 p-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Event Ticket Discount */}
                <div className="p-4 rounded-3xl bg-brand-50/50 dark:bg-brand-950/20 border border-brand-200/80 dark:border-brand-900/40 flex items-center justify-between">
                  <div>
                    <p className="text-xs text-brand-600 dark:text-brand-300 font-bold uppercase tracking-wider">Event Ticket Discount</p>
                    <p className="text-3xl font-black text-slate-900 dark:text-white mt-1 font-mono">
                      {isActive ? `${tierDetails?.ticket_discount_pct || 0}%` : '0%'}
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Applied on all campus events</p>
                  </div>
                  <span className="p-3 rounded-2xl bg-brand-100 dark:bg-brand-900/40 text-brand-600 dark:text-brand-300">
                    <Award className="w-6 h-6" />
                  </span>
                </div>

                {/* Merch Store Discount */}
                <div className="p-4 rounded-3xl bg-emerald-50/80 dark:bg-emerald-950/30 border border-emerald-200/80 dark:border-emerald-800/40 flex items-center justify-between">
                  <div>
                    <p className="text-xs text-emerald-700 dark:text-emerald-300 font-bold uppercase tracking-wider">Merch Store Discount</p>
                    <p className="text-3xl font-black text-slate-900 dark:text-white mt-1 font-mono">
                      {isActive ? `${tierDetails?.merch_discount_pct || 0}%` : '0%'}
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Applied on club apparel &amp; items</p>
                  </div>
                  <span className="p-3 rounded-2xl bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-300">
                    <Sparkles className="w-6 h-6" />
                  </span>
                </div>
              </div>

              {/* Validity Progress Meter */}
              {membership && (
                <div className="pt-4 border-t border-slate-100 dark:border-white/5 space-y-2">
                  <div className="flex justify-between text-xs font-semibold">
                    <span className="text-slate-600 dark:text-slate-300">Membership Term Duration</span>
                    <span className="text-slate-900 dark:text-white font-mono">{membership.days_until_expiry} days remaining</span>
                  </div>
                  <div className="w-full h-2.5 bg-slate-100 dark:bg-white/10 rounded-full overflow-hidden border border-slate-200/80 dark:border-white/5">
                    <div
                      className={`h-full transition-all duration-500 rounded-full ${
                        membership.days_until_expiry > 30
                          ? 'bg-emerald-500'
                          : membership.days_until_expiry > 0
                          ? 'bg-amber-500'
                          : 'bg-rose-500'
                      }`}
                      style={{
                        width: `${Math.min(100, Math.max(0, (membership.days_until_expiry / (tierDetails?.duration_days || 365)) * 100))}%`,
                      }}
                    />
                  </div>
                  <div className="flex justify-between text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                    <span>Start: {membership.start_date ? new Date(membership.start_date).toLocaleDateString() : '—'}</span>
                    <span>End: {membership.end_date ? new Date(membership.end_date).toLocaleDateString() : '—'}</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right 1 Col: Digital Membership Pass */}
        <div className="space-y-6">
          <Card className="bg-white/80 dark:bg-slate-900/70 backdrop-blur-xl border-slate-200/80 dark:border-white/10 shadow-xl rounded-3xl text-center overflow-hidden">
            <div className="py-3 px-4 bg-gradient-to-r from-brand-600 to-indigo-600 text-white font-bold text-xs tracking-wider uppercase">
              Official Membership Pass
            </div>
            <CardContent className="p-6 space-y-4">
              {membership?.qr_code ? (
                <div className="p-3 bg-white dark:bg-slate-800 rounded-3xl shadow-sm inline-block border border-slate-200 dark:border-white/10">
                  <img
                    src={membership.qr_code}
                    alt="Digital Pass QR"
                    className="w-40 h-40 object-contain mx-auto rounded-xl"
                  />
                </div>
              ) : (
                <div className="w-40 h-40 rounded-3xl bg-slate-50/80 dark:bg-white/5 border border-slate-200/80 dark:border-white/10 flex flex-col items-center justify-center p-4 text-slate-500 dark:text-slate-400 text-xs mx-auto">
                  <QrCode className="w-10 h-10 mb-2 opacity-40 text-slate-400" />
                  <p>QR pass will appear when dues are paid.</p>
                </div>
              )}

              <div className="space-y-1">
                <p className="text-base font-extrabold text-slate-900 dark:text-white">{user?.name || user?.username}</p>
                <p className="text-xs font-bold text-brand-600 dark:text-brand-400">{tierDetails?.name || 'Public Member'}</p>
                {membership?.verification_token && (
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 font-mono mt-2 truncate bg-slate-50 dark:bg-white/5 p-2 rounded-xl border border-slate-200/80 dark:border-slate-700/80">
                    Token: {membership.verification_token}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Renewal / Upgrade Modal */}
      {renewModalOpen && (
        <Modal
          isOpen={renewModalOpen}
          onClose={() => setRenewModalOpen(false)}
          title="Renew / Select Membership Plan"
        >
          <div className="space-y-5">
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Select your preferred tier. Recording payment will activate your discounts immediately and register the transaction in the ledger.
            </p>

            <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
              {availableTiers.map((t) => {
                const isSelected = String(selectedTierId) === String(t.id);
                return (
                  <div
                    key={t.id}
                    onClick={() => setSelectedTierId(t.id)}
                    className={`p-4 rounded-2xl border cursor-pointer flex items-center justify-between transition-all ${
                      isSelected
                        ? 'bg-brand-500/10 dark:bg-brand-500/20 border-brand-500 dark:border-brand-400 shadow-sm ring-2 ring-brand-500/30'
                        : 'bg-white/80 dark:bg-slate-900/60 border-slate-200/80 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/20'
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 dark:text-white text-sm">{t.name}</span>
                        <Badge variant="neutral" size="sm">{t.duration_days} days</Badge>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                        {t.ticket_discount_pct}% Ticket discount • {t.merch_discount_pct}% Merch discount
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="text-lg font-black text-slate-900 dark:text-white">${t.price}</span>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex gap-3 pt-2">
              <Button
                variant="outline"
                size="md"
                className="w-1/2"
                onClick={() => setRenewModalOpen(false)}
                disabled={renewing}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="md"
                className="w-1/2 font-bold"
                onClick={handleRenew}
                disabled={renewing || !selectedTierId}
              >
                {renewing ? 'Processing...' : 'Pay Dues & Activate'}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

