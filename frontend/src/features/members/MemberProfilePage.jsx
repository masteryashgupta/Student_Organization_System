import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../lib/AuthContext';
import api from '../../lib/api';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { useToast } from '../../components/ui/Toast';

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
      await refetchUser();
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
      <div className="max-w-4xl mx-auto py-12 text-center text-slate-400 space-y-4">
        <svg className="animate-spin h-8 w-8 text-brand-500 mx-auto" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        <p>Loading your membership pass and club perks...</p>
      </div>
    );
  }

  const membership = profileData?.membership;
  const availableTiers = profileData?.available_tiers || [];
  const isActive = membership?.computed_status === 'active' || membership?.status === 'active';
  const isExpiring = membership?.is_expiring_soon;
  const tierDetails = membership?.tier_details;

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-16 animate-fadeIn">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-6">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-brand-600 to-accent-500 flex items-center justify-center font-bold text-white text-base shadow-md">
              {(user?.name || user?.username || 'U').charAt(0).toUpperCase()}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white tracking-tight">
                {user?.name || user?.username}
              </h1>
              <p className="text-xs text-slate-400">{user?.email} • Role: <span className="capitalize font-semibold text-slate-300">{user?.role}</span></p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="primary"
            size="md"
            className="font-bold shadow-lg shadow-brand-600/30 gap-2"
            onClick={() => setRenewModalOpen(true)}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            {membership ? (isActive ? 'Renew / Extend Plan' : 'Pay Dues & Activate') : 'Join a Plan'}
          </Button>
        </div>
      </div>

      {/* Main Membership Banner */}
      {membership ? (
        <div
          className={`p-6 rounded-2xl border flex flex-col md:flex-row items-center justify-between gap-6 shadow-2xl ${
            isActive
              ? 'bg-gradient-to-r from-emerald-950/80 via-surface-900 to-surface-950 border-emerald-500/40 text-emerald-200'
              : membership.status === 'expired'
              ? 'bg-gradient-to-r from-rose-950/80 via-surface-900 to-surface-950 border-rose-500/40 text-rose-200'
              : 'bg-gradient-to-r from-amber-950/80 via-surface-900 to-surface-950 border-amber-500/40 text-amber-200'
          }`}
        >
          <div className="flex items-center gap-5 text-center md:text-left">
            <div
              className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 shadow-lg ${
                isActive
                  ? 'bg-emerald-500 text-emerald-950'
                  : membership.status === 'expired'
                  ? 'bg-rose-500 text-rose-950'
                  : 'bg-amber-500 text-amber-950'
              }`}
            >
              {isActive ? (
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              )}
            </div>

            <div>
              <div className="flex items-center gap-2">
                <Badge variant={isActive ? 'success' : membership.status === 'expired' ? 'danger' : 'warning'}>
                  {isActive ? 'Active Member' : membership.status === 'expired' ? 'Expired' : 'Pending Payment'}
                </Badge>
                <span className="text-xs text-brand-300 font-semibold">{tierDetails?.name}</span>
              </div>
              <h3 className="text-xl font-bold text-white mt-1">
                {isActive ? 'Your Membership is Active' : membership.status === 'expired' ? 'Membership Expired' : 'Dues Unpaid'}
              </h3>
              <p className="text-xs text-slate-300 mt-0.5">
                {isActive
                  ? `Valid until ${new Date(membership.end_date).toLocaleDateString()} (${membership.days_until_expiry} days remaining)`
                  : 'Pay annual dues to restore discounts and club voting rights.'}
              </p>
            </div>
          </div>

          <div className="text-center md:text-right shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setRenewModalOpen(true)}
              className="text-xs"
            >
              {isActive ? 'Extend Plan' : 'Pay Dues Now'}
            </Button>
          </div>
        </div>
      ) : (
        <Card className="bg-surface-900 border-amber-900/40 p-6 text-center space-y-3">
          <div className="w-12 h-12 rounded-xl bg-amber-950/60 border border-amber-800 text-amber-400 mx-auto flex items-center justify-center">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="text-lg font-bold text-white">No Active Membership Tier Enrolled</h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            You are currently registered as a public student. Join a membership tier to unlock ticket discounts, merch savings, and club voting rights.
          </p>
          <Button variant="primary" size="md" onClick={() => setRenewModalOpen(true)}>
            Choose a Membership Tier
          </Button>
        </Card>
      )}

      {/* Grid: 2 cols benefits & info + 1 col digital card */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left 2 Cols: Details & Benefits */}
        <div className="md:col-span-2 space-y-6">
          <Card className="bg-surface-900 border-slate-800">
            <CardHeader>
              <CardTitle className="text-base">Active Club Benefits & Discounts</CardTitle>
              <CardDescription className="text-xs">
                Discounts automatically applied across Event Ticketing and Merch Store.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-brand-950/30 border border-brand-800/40 flex items-center justify-between">
                  <div>
                    <p className="text-xs text-brand-300 font-semibold">Event Ticket Discount</p>
                    <p className="text-2xl font-black text-white mt-1">
                      {isActive ? `${tierDetails?.ticket_discount_pct || 0}%` : '0%'}
                    </p>
                    <p className="text-[11px] text-slate-400 mt-0.5">Applied on all campus events</p>
                  </div>
                  <span className="p-3 rounded-xl bg-brand-900/60 text-brand-300">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
                    </svg>
                  </span>
                </div>

                <div className="p-4 rounded-xl bg-accent-950/30 border border-accent-800/40 flex items-center justify-between">
                  <div>
                    <p className="text-xs text-accent-300 font-semibold">Merch Store Discount</p>
                    <p className="text-2xl font-black text-white mt-1">
                      {isActive ? `${tierDetails?.merch_discount_pct || 0}%` : '0%'}
                    </p>
                    <p className="text-[11px] text-slate-400 mt-0.5">Applied on club apparel & items</p>
                  </div>
                  <span className="p-3 rounded-xl bg-accent-900/60 text-accent-300">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                    </svg>
                  </span>
                </div>
              </div>

              {/* Validity Progress Meter */}
              {membership && (
                <div className="pt-4 border-t border-slate-800 space-y-2">
                  <div className="flex justify-between text-xs font-medium">
                    <span className="text-slate-400">Membership Term Duration</span>
                    <span className="text-slate-200">{membership.days_until_expiry} days remaining</span>
                  </div>
                  <div className="w-full h-2.5 bg-surface-950 rounded-full overflow-hidden border border-slate-800">
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
                  <div className="flex justify-between text-[11px] text-slate-500 font-mono">
                    <span>Start: {membership.start_date ? new Date(membership.start_date).toLocaleDateString() : '—'}</span>
                    <span>End: {membership.end_date ? new Date(membership.end_date).toLocaleDateString() : '—'}</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right 1 Col: Digital Pass & QR */}
        <div className="space-y-6">
          <Card className="bg-gradient-to-b from-surface-900 via-surface-900 to-surface-950 border-slate-700/80 shadow-2xl text-center overflow-hidden">
            <div className="p-4 bg-gradient-to-r from-brand-600 to-accent-600 text-white font-bold text-xs tracking-wider uppercase">
              Official Membership Pass
            </div>
            <CardContent className="p-6 space-y-4">
              {membership?.qr_code ? (
                <div className="p-3 bg-white rounded-2xl shadow-xl inline-block border-2 border-slate-700">
                  <img
                    src={membership.qr_code}
                    alt="Digital Pass QR"
                    className="w-40 h-40 object-contain mx-auto"
                  />
                </div>
              ) : (
                <div className="w-40 h-40 rounded-2xl bg-surface-800 border border-slate-700 flex flex-col items-center justify-center p-4 text-slate-500 text-xs mx-auto">
                  <p>QR pass will appear when dues are paid.</p>
                </div>
              )}

              <div>
                <p className="text-sm font-bold text-white">{user?.name || user?.username}</p>
                <p className="text-xs text-brand-400 font-medium">{tierDetails?.name || 'Public Member'}</p>
                {membership?.verification_token && (
                  <p className="text-[10px] text-slate-500 font-mono mt-2 truncate bg-surface-950 p-1 rounded border border-slate-800">
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
            <p className="text-xs text-slate-400">
              Select your preferred tier. Recording payment will activate your discounts immediately and register the transaction in the ledger.
            </p>

            <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
              {availableTiers.map((t) => {
                const isSelected = String(selectedTierId) === String(t.id);
                return (
                  <div
                    key={t.id}
                    onClick={() => setSelectedTierId(t.id)}
                    className={`p-4 rounded-xl border cursor-pointer flex items-center justify-between transition-colors ${
                      isSelected
                        ? 'bg-brand-950/50 border-brand-500 shadow-md'
                        : 'bg-surface-900 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white text-sm">{t.name}</span>
                        <Badge variant="neutral" size="sm">{t.duration_days} days</Badge>
                      </div>
                      <p className="text-xs text-slate-400 mt-1">
                        {t.ticket_discount_pct}% Ticket discount • {t.merch_discount_pct}% Merch discount
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="text-lg font-bold text-white">${t.price}</span>
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
