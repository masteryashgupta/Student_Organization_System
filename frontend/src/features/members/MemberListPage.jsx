import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../lib/AuthContext';
import api from '../../lib/api';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../components/ui/Card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../components/ui/Table';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
import { useToast } from '../../components/ui/Toast';

export default function MemberListPage() {
  const { isOfficer } = useAuth();
  const { addToast } = useToast();

  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Modal States
  const [selectedMemberQR, setSelectedMemberQR] = useState(null);
  const [payDuesMember, setPayDuesMember] = useState(null);
  const [processingPayment, setProcessingPayment] = useState(false);

  useEffect(() => {
    if (isOfficer) {
      fetchMembers();
    } else {
      setLoading(false);
    }
  }, [statusFilter, isOfficer]);

  const fetchMembers = async (searchQuery = search) => {
    if (!isOfficer) return;
    try {
      setLoading(true);
      const params = {};
      if (statusFilter !== 'all') params.status = statusFilter;
      if (searchQuery.trim()) params.search = searchQuery.trim();

      const res = await api.get('/members', { params });
      const data = res.data.results || res.data || [];
      setMembers(data);
    } catch (err) {
      console.error('Failed to fetch members:', err);
      if (err.response?.status === 403) {
        addToast({
          title: 'Access Restricted',
          description: 'Officer permissions are required to view the member directory.',
          variant: 'warning',
        });
      } else {
        addToast({
          title: 'Error Loading Members',
          description: err.response?.data?.message || 'Failed to retrieve membership records from server.',
          variant: 'danger',
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchMembers(search);
  };

  const handleRecordDues = async () => {
    if (!payDuesMember) return;
    setProcessingPayment(true);
    try {
      const res = await api.post(`/members/${payDuesMember.id}/pay-dues`, {
        payment_method: 'door_officer_cash',
      });
      addToast({
        title: 'Dues Payment Recorded',
        description: res.data.message || `Successfully activated membership for ${payDuesMember.user_details?.name}.`,
        variant: 'success',
      });
      setPayDuesMember(null);
      fetchMembers();
    } catch (err) {
      console.error('Failed to record dues:', err);
      addToast({
        title: 'Payment Failed',
        description: err.response?.data?.detail || 'Could not record dues payment.',
        variant: 'danger',
      });
    } finally {
      setProcessingPayment(false);
    }
  };

  // Metrics
  const totalCount = members.length;
  const activeCount = members.filter((m) => m.computed_status === 'active' || m.status === 'active').length;
  const pendingCount = members.filter((m) => m.status === 'pending' || !m.dues_paid).length;
  const expiredCount = members.filter((m) => m.status === 'expired' || m.computed_status === 'expired').length;

  const getStatusBadge = (status, computedStatus) => {
    const s = computedStatus || status;
    switch (s) {
      case 'active':
        return <Badge variant="success">Active</Badge>;
      case 'expired':
        return <Badge variant="danger">Expired</Badge>;
      case 'pending':
        return <Badge variant="warning">Pending Dues</Badge>;
      default:
        return <Badge variant="neutral">{s}</Badge>;
    }
  };

  if (!isOfficer) {
    return (
      <div className="max-w-2xl mx-auto py-12">
        <Card className="border-rose-200/80 dark:border-rose-900/50 bg-rose-50/80 dark:bg-rose-950/30 backdrop-blur-xl shadow-lg">
          <CardContent className="p-8 text-center space-y-4">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">Officer Access Required</h2>
            <p className="text-slate-600 dark:text-slate-300 text-sm">
              The full member directory and roster management is reserved for club officers and administrators.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 animate-fadeIn">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 dark:border-white/10 pb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">Membership Directory & Roster</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            View, search, and manage all student association memberships and dues payments.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <Link to="/members/profile">
            <Button variant="outline" size="sm" className="gap-2">
              My Membership
            </Button>
          </Link>
          <Link to="/members/verify">
            <Button variant="outline" size="sm" className="gap-2">
              <svg className="w-4 h-4 text-brand-600 dark:text-brand-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              Door Scanner
            </Button>
          </Link>
          <Link to="/join">
            <Button variant="primary" size="sm" className="gap-2 font-bold shadow-md">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
              </svg>
              + New Member
            </Button>
          </Link>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-5 rounded-3xl bg-white/80 dark:bg-slate-900/70 backdrop-blur-xl border border-slate-200/80 dark:border-white/10 shadow-sm hover:border-brand-300 dark:hover:border-brand-500/30 transition-all">
          <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider">Total Roster</p>
          <p className="text-3xl font-extrabold text-slate-900 dark:text-white mt-1.5">{totalCount}</p>
        </div>
        <div className="p-5 rounded-3xl bg-emerald-50/80 dark:bg-emerald-950/30 backdrop-blur-xl border border-emerald-200/80 dark:border-emerald-800/40 shadow-sm">
          <p className="text-xs text-emerald-700 dark:text-emerald-300 font-semibold uppercase tracking-wider">Active Members</p>
          <p className="text-3xl font-extrabold text-emerald-900 dark:text-emerald-100 mt-1.5">{activeCount}</p>
        </div>
        <div className="p-5 rounded-3xl bg-amber-50/80 dark:bg-amber-950/30 backdrop-blur-xl border border-amber-200/80 dark:border-amber-800/40 shadow-sm">
          <p className="text-xs text-amber-700 dark:text-amber-300 font-semibold uppercase tracking-wider">Pending Dues</p>
          <p className="text-3xl font-extrabold text-amber-900 dark:text-amber-100 mt-1.5">{pendingCount}</p>
        </div>
        <div className="p-5 rounded-3xl bg-rose-50/80 dark:bg-rose-950/30 backdrop-blur-xl border border-rose-200/80 dark:border-rose-800/40 shadow-sm">
          <p className="text-xs text-rose-700 dark:text-rose-300 font-semibold uppercase tracking-wider">Expired Passes</p>
          <p className="text-3xl font-extrabold text-rose-900 dark:text-rose-100 mt-1.5">{expiredCount}</p>
        </div>
      </div>

      {/* Search & Filter Controls */}
      <Card className="bg-white/80 dark:bg-slate-900/70 backdrop-blur-xl border-slate-200/80 dark:border-white/10 shadow-sm">
        <CardContent className="p-4 sm:p-5">
          <div className="flex flex-col md:flex-row gap-4 justify-between items-center">
            {/* Status Filter Tabs */}
            <div className="flex items-center gap-1.5 p-1 bg-slate-100/80 dark:bg-white/5 backdrop-blur-md rounded-2xl border border-slate-200/80 dark:border-white/10 w-full md:w-auto overflow-x-auto">
              {[
                { label: 'All Members', value: 'all' },
                { label: 'Active', value: 'active' },
                { label: 'Pending Dues', value: 'pending' },
                { label: 'Expired', value: 'expired' },
              ].map((tab) => (
                <button
                  key={tab.value}
                  onClick={() => setStatusFilter(tab.value)}
                  className={`px-4 py-1.5 text-xs font-semibold rounded-xl transition-all whitespace-nowrap ${
                    statusFilter === tab.value
                      ? 'bg-gradient-to-r from-brand-600 to-indigo-600 text-white shadow-sm'
                      : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-white/60 dark:hover:bg-white/10'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Search Bar */}
            <form onSubmit={handleSearchSubmit} className="flex gap-2 w-full md:w-80">
              <Input
                placeholder="Search by name, email, or tier..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="py-2 text-xs"
              />
              <Button type="submit" variant="outline" size="sm" className="px-4">
                Search
              </Button>
            </form>
          </div>
        </CardContent>
      </Card>

      {/* Main Members Table */}
      <Card className="bg-white/80 dark:bg-slate-900/70 backdrop-blur-xl border-slate-200/80 dark:border-white/10 shadow-xl overflow-hidden">
        <CardContent className="p-0">
          {loading ? (
            <div className="p-12 text-center text-slate-500 dark:text-slate-400 text-sm space-y-3">
              <svg className="animate-spin h-6 w-6 text-brand-600 dark:text-brand-400 mx-auto" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <p>Fetching member database records...</p>
            </div>
          ) : members.length === 0 ? (
            <div className="p-12 text-center text-slate-500 dark:text-slate-400 text-sm space-y-2">
              <p className="font-semibold text-slate-900 dark:text-white">No members found.</p>
              <p className="text-xs">Try adjusting your search query or status filter.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student / Member</TableHead>
                  <TableHead>Tier & Duration</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Dues Payment</TableHead>
                  <TableHead>Expiry / Validity</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {members.map((m) => {
                  const u = m.user_details || {};
                  const t = m.tier_details || {};
                  const isExpiring = m.is_expiring_soon;

                  return (
                    <TableRow key={m.id} className="hover:bg-brand-500/5 dark:hover:bg-white/[0.04]">
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-2xl bg-brand-500/10 dark:bg-brand-500/20 border border-brand-500/20 flex items-center justify-center font-extrabold text-brand-600 dark:text-brand-300 text-sm shadow-xs">
                            {(u.name || u.email || 'M').charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-bold text-slate-900 dark:text-white">{u.name || u.username}</p>
                            <p className="text-xs text-slate-500 dark:text-slate-400">{u.email}</p>
                          </div>
                        </div>
                      </TableCell>

                      <TableCell>
                        <div>
                          <p className="font-semibold text-slate-900 dark:text-slate-200">{t.name || 'Standard Tier'}</p>
                          <p className="text-xs text-brand-600 dark:text-brand-400 font-mono font-bold">${t.price || '0.00'}</p>
                        </div>
                      </TableCell>

                      <TableCell>
                        {getStatusBadge(m.status, m.computed_status)}
                        {isExpiring && (
                          <span className="block text-[11px] text-amber-600 dark:text-amber-400 font-medium mt-1">
                            Expiring in {m.days_until_expiry}d
                          </span>
                        )}
                      </TableCell>

                      <TableCell>
                        <div className="space-y-0.5">
                          <span className={`text-xs font-semibold flex items-center gap-1.5 ${m.dues_paid ? 'text-emerald-700 dark:text-emerald-300' : 'text-rose-700 dark:text-rose-300'}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${m.dues_paid ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                            {m.dues_paid ? 'Paid' : 'Unpaid'}
                          </span>
                          {m.dues_paid && (
                            <span className="text-[11px] text-slate-500 dark:text-slate-400 block">${m.dues_amount_paid} recorded</span>
                          )}
                        </div>
                      </TableCell>

                      <TableCell>
                        <div>
                          <p className="text-xs text-slate-800 dark:text-slate-200">
                            {m.end_date ? new Date(m.end_date).toLocaleDateString() : '—'}
                          </p>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400">
                            {m.days_until_expiry > 0 ? `${m.days_until_expiry} days left` : 'Expired / None'}
                          </p>
                        </div>
                      </TableCell>

                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          {m.qr_code && (
                            <Button
                              variant="ghost"
                              size="sm"
                              title="Show Member QR"
                              onClick={() => setSelectedMemberQR(m)}
                              className="p-2 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white rounded-full"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                              </svg>
                            </Button>
                          )}

                          {(!m.dues_paid || m.status === 'expired') && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-xs text-emerald-700 dark:text-emerald-300 border-emerald-600/40 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 rounded-full"
                              onClick={() => setPayDuesMember(m)}
                            >
                              Record Dues
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Member QR Modal */}
      {selectedMemberQR && (
        <Modal
          isOpen={Boolean(selectedMemberQR)}
          onClose={() => setSelectedMemberQR(null)}
          title={`Digital Pass — ${selectedMemberQR.user_details?.name || selectedMemberQR.user_details?.email}`}
        >
          <div className="text-center space-y-4">
            <div className="p-4 bg-white dark:bg-slate-800 rounded-3xl inline-block shadow-md border border-slate-200/80 dark:border-white/10">
              <img
                src={selectedMemberQR.qr_code}
                alt="Member QR Code"
                className="w-48 h-48 object-contain mx-auto"
              />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-900 dark:text-white">{selectedMemberQR.tier_details?.name}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-mono mt-1">
                Token: {selectedMemberQR.verification_token}
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() => setSelectedMemberQR(null)}
            >
              Close
            </Button>
          </div>
        </Modal>
      )}

      {/* Record Dues Payment Confirmation Modal */}
      {payDuesMember && (
        <Modal
          isOpen={Boolean(payDuesMember)}
          onClose={() => setPayDuesMember(null)}
          title="Record Membership Dues Payment"
        >
          <div className="space-y-4">
            <p className="text-sm text-slate-600 dark:text-slate-300">
              Confirm recording dues payment for <strong className="text-slate-900 dark:text-white">{payDuesMember.user_details?.name}</strong> ({payDuesMember.user_details?.email}).
            </p>

            <div className="p-4 rounded-2xl bg-slate-50/80 dark:bg-white/5 border border-slate-200/80 dark:border-white/10 space-y-2">
              <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400">
                <span>Selected Plan</span>
                <span className="font-semibold text-slate-900 dark:text-white">{payDuesMember.tier_details?.name}</span>
              </div>
              <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400">
                <span>Amount Due</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400 text-sm">${payDuesMember.tier_details?.price}</span>
              </div>
              <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400">
                <span>New Validity</span>
                <span className="font-semibold text-slate-900 dark:text-white">{payDuesMember.tier_details?.duration_days} days</span>
              </div>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400">
              This action will mark the membership as active, set the start/end dates, and record an income transaction in the central ledger.
            </p>

            <div className="flex gap-3 pt-2">
              <Button
                variant="outline"
                size="md"
                className="w-1/2"
                onClick={() => setPayDuesMember(null)}
                disabled={processingPayment}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="md"
                className="w-1/2 font-bold"
                onClick={handleRecordDues}
                disabled={processingPayment}
              >
                {processingPayment ? 'Recording...' : 'Confirm & Activate'}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

