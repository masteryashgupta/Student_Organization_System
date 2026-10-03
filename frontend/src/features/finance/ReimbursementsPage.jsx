import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../lib/AuthContext';
import { useToast } from '../../components/ui/Toast';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Modal } from '../../components/ui/Modal';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../components/ui/Table';
import {
  getReimbursements,
  createReimbursement,
  approveReimbursement,
  rejectReimbursement,
  markReimbursementPaid,
} from './financeApi';

export default function ReimbursementsPage() {
  const [activeTab, setActiveTab] = useState('submit'); // 'submit' or 'queue'
  const [statusFilter, setStatusFilter] = useState('');
  
  // Submission Form State
  const [form, setForm] = useState({
    amount: '',
    description: '',
    receiptFile: null,
  });
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  // Action Modal State (for officer notes on approve/reject)
  const [actionModal, setActionModal] = useState({
    isOpen: false,
    type: null, // 'approve' | 'reject' | 'markPaid'
    item: null,
    notes: '',
  });

  const { user, isOfficer } = useAuth();
  const toast = useToast();
  const queryClient = useQueryClient();

  // Fetch Reimbursements List (Live API via TanStack Query)
  const { data: reimbursements = [], isLoading, isError, refetch } = useQuery({
    queryKey: ['reimbursements', statusFilter],
    queryFn: () => getReimbursements(statusFilter ? { status: statusFilter } : {}),
  });

  // Action Mutations
  const approveMut = useMutation({
    mutationFn: ({ id, notes }) => approveReimbursement(id, notes),
    onSuccess: () => {
      toast.success('Reimbursement approved & recorded in central ledger!');
      closeActionModal();
      queryClient.invalidateQueries({ queryKey: ['reimbursements'] });
      queryClient.invalidateQueries({ queryKey: ['financeSummary'] });
      queryClient.invalidateQueries({ queryKey: ['financeTransactions'] });
    },
    onError: (err) => {
      toast.error(err.response?.data?.detail || 'Approval failed.');
    },
  });

  const rejectMut = useMutation({
    mutationFn: ({ id, notes }) => rejectReimbursement(id, notes),
    onSuccess: () => {
      toast.success('Reimbursement request rejected.');
      closeActionModal();
      queryClient.invalidateQueries({ queryKey: ['reimbursements'] });
    },
    onError: (err) => {
      toast.error(err.response?.data?.detail || 'Rejection failed.');
    },
  });

  const markPaidMut = useMutation({
    mutationFn: ({ id, notes }) => markReimbursementPaid(id, notes),
    onSuccess: () => {
      toast.success('Reimbursement marked as paid out!');
      closeActionModal();
      queryClient.invalidateQueries({ queryKey: ['reimbursements'] });
    },
    onError: (err) => {
      toast.error(err.response?.data?.detail || 'Action failed.');
    },
  });

  const closeActionModal = () => {
    setActionModal({ isOpen: false, type: null, item: null, notes: '' });
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) {
      setForm((prev) => ({ ...prev, receiptFile: null }));
      return;
    }

    // Validate size (10MB max)
    if (file.size > 10 * 1024 * 1024) {
      setErrors((prev) => ({ ...prev, receipt: 'Receipt file size must be less than 10MB.' }));
      return;
    }

    // Validate extension
    const ext = file.name.split('.').pop().toLowerCase();
    const validExts = ['pdf', 'jpg', 'jpeg', 'png', 'webp'];
    if (!validExts.includes(ext)) {
      setErrors((prev) => ({ ...prev, receipt: `Invalid format .${ext}. Allowed: PDF, JPG, PNG, WEBP.` }));
      return;
    }

    setErrors((prev) => ({ ...prev, receipt: null }));
    setForm((prev) => ({ ...prev, receiptFile: file }));
  };

  const validateSubmission = () => {
    const errs = {};
    if (!form.amount || parseFloat(form.amount) <= 0) {
      errs.amount = 'Reimbursement amount must be strictly greater than $0.00';
    }
    if (!form.description.trim() || form.description.trim().length < 5) {
      errs.description = 'Itemized description must be at least 5 characters long';
    }
    if (errors.receipt) {
      errs.receipt = errors.receipt;
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateSubmission()) return;

    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('amount', form.amount);
      formData.append('description', form.description.trim());
      if (form.receiptFile) {
        formData.append('receipt', form.receiptFile);
      }

      await createReimbursement(formData);
      toast.success('Reimbursement request submitted successfully!');
      setForm({ amount: '', description: '', receiptFile: null });
      setErrors({});
      queryClient.invalidateQueries({ queryKey: ['reimbursements'] });
    } catch (err) {
      const respData = err.response?.data;
      if (respData?.details) {
        setErrors(respData.details);
      } else {
        const msg = respData?.amount?.[0] || respData?.receipt?.[0] || respData?.detail || 'Failed to submit request.';
        toast.error(msg);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleExecuteAction = () => {
    const { type, item, notes } = actionModal;
    if (!item) return;

    if (type === 'approve') {
      approveMut.mutate({ id: item.id, notes });
    } else if (type === 'reject') {
      rejectMut.mutate({ id: item.id, notes });
    } else if (type === 'markPaid') {
      markPaidMut.mutate({ id: item.id, notes });
    }
  };

  const getStatusBadgeVariant = (status) => {
    switch (status) {
      case 'pending':
        return 'warning';
      case 'approved':
        return 'info';
      case 'paid':
        return 'success';
      case 'rejected':
        return 'danger';
      default:
        return 'neutral';
    }
  };

  const pendingList = reimbursements.filter((r) => r.status === 'pending');
  const pendingTotal = pendingList.reduce((acc, curr) => acc + parseFloat(curr.amount || 0), 0);

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-surface-900 via-surface-850 to-brand-950/60 p-6 rounded-2xl border border-slate-800 shadow-xl">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-brand-500/20 text-brand-300 border border-brand-500/30">
              Treasury Management
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">Member Reimbursements</h1>
          <p className="text-sm text-slate-400 mt-1">
            Submit out-of-pocket expense claims or review pending officer approvals.
          </p>
        </div>

        {/* View Switcher Tabs */}
        <div className="flex items-center gap-2 bg-surface-950 p-1.5 rounded-xl border border-slate-800">
          <button
            onClick={() => setActiveTab('submit')}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'submit'
                ? 'bg-brand-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            Submit Request
          </button>
          {isOfficer && (
            <button
              onClick={() => setActiveTab('queue')}
              className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all flex items-center gap-2 ${
                activeTab === 'queue'
                  ? 'bg-brand-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <span>Officer Queue</span>
              {pendingList.length > 0 && (
                <span className="w-5 h-5 rounded-full bg-amber-500 text-slate-950 text-[11px] font-bold flex items-center justify-center">
                  {pendingList.length}
                </span>
              )}
            </button>
          )}
        </div>
      </div>

      {/* VIEW 1: VOLUNTEER / MEMBER SUBMISSION & MY REQUESTS */}
      {activeTab === 'submit' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Submission Form Card */}
          <Card className="lg:col-span-1 border-slate-800">
            <CardHeader>
              <CardTitle className="text-lg text-white">Request Reimbursement</CardTitle>
              <CardDescription className="text-xs">
                Submit an itemized claim for club expenses paid out of pocket.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <Input
                  label="Claim Amount ($)"
                  type="number"
                  step="0.01"
                  placeholder="25.00"
                  value={form.amount}
                  onChange={(e) => setForm((prev) => ({ ...prev, amount: e.target.value }))}
                  error={errors.amount}
                  required
                />

                <div className="space-y-1">
                  <label className="block text-xs font-medium text-slate-300">
                    Itemized Description <span className="text-danger-400">*</span>
                  </label>
                  <textarea
                    rows="3"
                    placeholder="e.g. Pizza and drinks for Friday workshop"
                    value={form.description}
                    onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-surface-950 border border-slate-700/80 text-white text-sm focus:outline-none focus:border-brand-500 transition-colors"
                    required
                  />
                  {errors.description && <p className="text-xs text-danger-400">{errors.description}</p>}
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-medium text-slate-300">
                    Receipt Image / PDF Proof
                  </label>
                  <input
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png,.webp"
                    onChange={handleFileChange}
                    className="w-full text-xs text-slate-300 file:mr-3 file:py-2 file:px-3.5 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-brand-600/20 file:text-brand-300 hover:file:bg-brand-600/30 cursor-pointer"
                  />
                  {errors.receipt ? (
                    <p className="text-xs text-danger-400">{errors.receipt}</p>
                  ) : (
                    <p className="text-[11px] text-slate-500">Allowed formats: PDF, JPG, PNG, WEBP (Max 10MB)</p>
                  )}
                </div>

                <Button
                  type="submit"
                  variant="primary"
                  className="w-full mt-2"
                  isLoading={submitting}
                >
                  Submit Reimbursement
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* User's Submitted Claims List */}
          <Card className="lg:col-span-2 border-slate-800">
            <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4">
              <div>
                <CardTitle className="text-lg text-white">Recent Requests & History</CardTitle>
                <CardDescription className="text-xs">
                  Track current approval status and review officer feedback.
                </CardDescription>
              </div>
              <Select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="text-xs py-1"
                options={[
                  { value: '', label: 'All Statuses' },
                  { value: 'pending', label: 'Pending Review' },
                  { value: 'approved', label: 'Approved' },
                  { value: 'paid', label: 'Paid Out' },
                  { value: 'rejected', label: 'Rejected' },
                ]}
              />
            </CardHeader>
            <CardContent className="p-0">
              {isLoading ? (
                <div className="py-12 text-center text-slate-400 text-sm">Loading reimbursement history...</div>
              ) : isError ? (
                <div className="py-8 text-center text-danger-300 text-sm">
                  Failed to load reimbursements. <Button size="sm" variant="ghost" onClick={() => refetch()}>Retry</Button>
                </div>
              ) : reimbursements.length === 0 ? (
                <div className="py-12 text-center text-slate-400 text-sm">
                  No reimbursement claims found matching your filter.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableRow>
                        <TableHead>Submitted</TableHead>
                        <TableHead>Requester</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Receipt</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                      </TableRow>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reimbursements.map((item) => (
                      <TableRow key={item.id} className="hover:bg-slate-800/40">
                        <TableCell className="text-xs font-mono text-slate-300 whitespace-nowrap">
                          {new Date(item.created_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-xs font-medium text-slate-200">
                          {item.requester_name}
                        </TableCell>
                        <TableCell className="text-xs text-slate-300 max-w-[200px] truncate">
                          {item.description}
                          {item.notes && <p className="text-[11px] text-amber-400 italic">Note: {item.notes}</p>}
                        </TableCell>
                        <TableCell>
                          <Badge variant={getStatusBadgeVariant(item.status)}>
                            {item.status_display || item.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs">
                          {item.receipt_url ? (
                            <a
                              href={item.receipt_url}
                              target="_blank"
                              rel="noreferrer"
                              className="text-brand-400 hover:underline font-medium flex items-center gap-1"
                            >
                              📄 Receipt
                            </a>
                          ) : (
                            <span className="text-slate-500">None</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right font-bold text-sm text-white">
                          ${item.amount}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* VIEW 2: OFFICER APPROVAL QUEUE */}
      {activeTab === 'queue' && isOfficer && (
        <div className="space-y-6">
          {/* Officer Metrics Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card className="border-amber-500/30 bg-amber-950/20">
              <CardHeader className="pb-2">
                <CardDescription className="text-amber-400 text-xs font-semibold uppercase">
                  Pending Review Queue
                </CardDescription>
                <CardTitle className="text-2xl text-white">
                  {pendingList.length} request(s)
                </CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-slate-400">
                Total Pending Value: <strong className="text-amber-300">${pendingTotal.toFixed(2)}</strong>
              </CardContent>
            </Card>

            <Card className="border-info-500/30 bg-info-950/20">
              <CardHeader className="pb-2">
                <CardDescription className="text-info-400 text-xs font-semibold uppercase">
                  Approved & Ledger Logged
                </CardDescription>
                <CardTitle className="text-2xl text-white">
                  {reimbursements.filter((r) => r.status === 'approved').length} request(s)
                </CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-slate-400">
                Posted to central expense ledger
              </CardContent>
            </Card>

            <Card className="border-emerald-500/30 bg-emerald-950/20">
              <CardHeader className="pb-2">
                <CardDescription className="text-emerald-400 text-xs font-semibold uppercase">
                  Paid Out & Completed
                </CardDescription>
                <CardTitle className="text-2xl text-white">
                  {reimbursements.filter((r) => r.status === 'paid').length} request(s)
                </CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-slate-400">
                Disbursements completed
              </CardContent>
            </Card>
          </div>

          {/* Queue Table */}
          <Card className="border-slate-800">
            <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4">
              <div>
                <CardTitle className="text-lg text-white">Officer Approval & Disbursement Desk</CardTitle>
                <CardDescription className="text-xs">
                  Review submitted claims, inspect receipts, approve to record in central ledger, or mark as paid.
                </CardDescription>
              </div>
              <Select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="text-xs py-1"
                options={[
                  { value: '', label: 'All Statuses' },
                  { value: 'pending', label: 'Pending Review Only' },
                  { value: 'approved', label: 'Approved' },
                  { value: 'paid', label: 'Paid Out' },
                  { value: 'rejected', label: 'Rejected' },
                ]}
              />
            </CardHeader>
            <CardContent className="p-0">
              {isLoading ? (
                <div className="py-12 text-center text-slate-400 text-sm">Loading officer queue...</div>
              ) : reimbursements.length === 0 ? (
                <div className="py-12 text-center text-slate-400 text-sm">No reimbursements found.</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Submitted</TableHead>
                      <TableHead>Requester</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Receipt</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead className="text-right">Officer Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reimbursements.map((item) => (
                      <TableRow key={item.id} className="hover:bg-slate-800/40">
                        <TableCell className="text-xs font-mono text-slate-300 whitespace-nowrap">
                          {new Date(item.created_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-xs font-medium text-white">
                          <div>{item.requester_name}</div>
                          <div className="text-[11px] text-slate-400">{item.requester_email}</div>
                        </TableCell>
                        <TableCell className="text-xs text-slate-300 max-w-[200px] truncate">
                          {item.description}
                        </TableCell>
                        <TableCell className="text-xs">
                          {item.receipt_url ? (
                            <a
                              href={item.receipt_url}
                              target="_blank"
                              rel="noreferrer"
                              className="text-brand-400 hover:underline font-semibold"
                            >
                              View Proof
                            </a>
                          ) : (
                            <span className="text-slate-500">No Receipt</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant={getStatusBadgeVariant(item.status)}>
                            {item.status_display || item.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-bold text-sm text-white whitespace-nowrap">
                          ${item.amount}
                        </TableCell>
                        <TableCell className="text-right whitespace-nowrap">
                          {item.status === 'pending' && (
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                variant="primary"
                                size="sm"
                                className="text-xs py-1 px-2.5 bg-emerald-600 hover:bg-emerald-500"
                                onClick={() => setActionModal({ isOpen: true, type: 'approve', item, notes: '' })}
                              >
                                Approve & Record
                              </Button>
                              <Button
                                variant="danger"
                                size="sm"
                                className="text-xs py-1 px-2.5"
                                onClick={() => setActionModal({ isOpen: true, type: 'reject', item, notes: '' })}
                              >
                                Reject
                              </Button>
                            </div>
                          )}

                          {item.status === 'approved' && (
                            <Button
                              variant="secondary"
                              size="sm"
                              className="text-xs py-1 px-2.5 border-emerald-500/40 text-emerald-300 hover:bg-emerald-950/60"
                              onClick={() => setActionModal({ isOpen: true, type: 'markPaid', item, notes: '' })}
                            >
                              Mark as Paid
                            </Button>
                          )}

                          {(item.status === 'paid' || item.status === 'rejected') && (
                            <span className="text-xs text-slate-500 font-mono">
                              {item.status === 'paid' ? 'Completed' : 'Closed'}
                            </span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Action Dialog Modal */}
      <Modal
        isOpen={actionModal.isOpen}
        onClose={closeActionModal}
        title={
          actionModal.type === 'approve'
            ? 'Approve Reimbursement Claim'
            : actionModal.type === 'reject'
            ? 'Reject Reimbursement Claim'
            : 'Mark Reimbursement as Paid'
        }
      >
        {actionModal.item && (
          <div className="space-y-4">
            <div className="p-3.5 rounded-xl bg-surface-950 border border-slate-800 text-xs space-y-1">
              <p><strong>Claim ID:</strong> #{actionModal.item.id}</p>
              <p><strong>Requester:</strong> {actionModal.item.requester_name} ({actionModal.item.requester_email})</p>
              <p><strong>Amount:</strong> <span className="text-emerald-400 font-bold">${actionModal.item.amount}</span></p>
              <p><strong>Description:</strong> {actionModal.item.description}</p>
            </div>

            {actionModal.type === 'approve' && (
              <p className="text-xs text-emerald-400 bg-emerald-950/40 p-2.5 rounded-lg border border-emerald-800/40">
                Approving this claim will automatically post a <strong>${actionModal.item.amount} expense transaction</strong> into the central shared ledger.
              </p>
            )}

            <div className="space-y-1">
              <label className="block text-xs font-medium text-slate-300">
                Officer Notes / Reason (Optional)
              </label>
              <textarea
                rows="3"
                placeholder={actionModal.type === 'reject' ? 'State reason for rejection...' : 'Add payment transfer reference or notes...'}
                value={actionModal.notes}
                onChange={(e) => setActionModal((prev) => ({ ...prev, notes: e.target.value }))}
                className="w-full px-3 py-2 rounded-xl bg-surface-950 border border-slate-700 text-white text-xs focus:outline-none focus:border-brand-500"
              />
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
              <Button variant="outline" size="sm" onClick={closeActionModal}>
                Cancel
              </Button>
              <Button
                variant={actionModal.type === 'reject' ? 'danger' : 'primary'}
                size="sm"
                onClick={handleExecuteAction}
                isLoading={approveMut.isPending || rejectMut.isPending || markPaidMut.isPending}
              >
                {actionModal.type === 'approve'
                  ? 'Confirm & Record Ledger Expense'
                  : actionModal.type === 'reject'
                  ? 'Confirm Rejection'
                  : 'Confirm Paid Out'}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
