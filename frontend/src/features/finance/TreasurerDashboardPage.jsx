import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { useAuth } from '../../lib/AuthContext';
import { useToast } from '../../components/ui/Toast';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Modal } from '../../components/ui/Modal';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../components/ui/Table';
import { getFinanceSummary, getTransactions, createManualTransaction } from './financeApi';

export default function TreasurerDashboardPage() {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Manual Entry Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [manualForm, setManualForm] = useState({
    type: 'income',
    category: 'fundraiser',
    amount: '',
    source: '',
    description: '',
  });
  const [formErrors, setFormErrors] = useState({});

  const { isOfficer } = useAuth();
  const toast = useToast();
  const queryClient = useQueryClient();

  // 1. Fetch Finance Summary (Live API)
  const { data: summary, isLoading: isSummaryLoading, isError: isSummaryError } = useQuery({
    queryKey: ['financeSummary', startDate, endDate],
    queryFn: () =>
      getFinanceSummary({
        ...(startDate && { start_date: startDate }),
        ...(endDate && { end_date: endDate }),
      }),
  });

  // 2. Fetch Ledger Transactions (Live API)
  const { data: txData, isLoading: isTxLoading, isError: isTxError } = useQuery({
    queryKey: ['financeTransactions', typeFilter, categoryFilter, searchQuery, startDate, endDate],
    queryFn: () =>
      getTransactions({
        ...(typeFilter && { type: typeFilter }),
        ...(categoryFilter && { category: categoryFilter }),
        ...(searchQuery && { search: searchQuery }),
        ...(startDate && { start_date: startDate }),
        ...(endDate && { end_date: endDate }),
      }),
  });

  const transactions = txData?.results || [];

  // Manual Transaction Mutation
  const manualMutation = useMutation({
    mutationFn: (data) => createManualTransaction(data),
    onSuccess: () => {
      toast.success('Manual transaction recorded in central ledger!');
      setIsModalOpen(false);
      setManualForm({
        type: 'income',
        category: 'fundraiser',
        amount: '',
        source: '',
        description: '',
      });
      queryClient.invalidateQueries({ queryKey: ['financeSummary'] });
      queryClient.invalidateQueries({ queryKey: ['financeTransactions'] });
    },
    onError: (err) => {
      const msg = err.response?.data?.detail || 'Failed to record manual transaction.';
      toast.error(msg);
    },
  });

  // Export CSV Handler
  const handleExportCSV = () => {
    if (!transactions.length) {
      toast.error('No transactions available to export.');
      return;
    }

    const headers = ['ID', 'Date', 'Type', 'Category', 'Source', 'Description', 'Amount'];
    const rows = transactions.map((t) => [
      t.id,
      new Date(t.date).toISOString().split('T')[0],
      t.type,
      t.category,
      `"${(t.source || '').replace(/"/g, '""')}"`,
      `"${(t.description || '').replace(/"/g, '""')}"`,
      t.type === 'expense' ? `-${t.amount}` : t.amount,
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `skyline_ledger_export_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Ledger CSV exported successfully!');
  };

  const handleManualSubmit = (e) => {
    e.preventDefault();
    const errs = {};
    if (!manualForm.amount || parseFloat(manualForm.amount) <= 0) {
      errs.amount = 'Amount must be strictly greater than $0.00';
    }
    if (!manualForm.source.trim() || manualForm.source.trim().length < 3) {
      errs.source = 'Source name must be at least 3 characters long';
    }
    setFormErrors(errs);
    if (Object.keys(errs).length > 0) return;

    manualMutation.mutate({
      type: manualForm.type,
      category: manualForm.category,
      amount: manualForm.amount,
      source: manualForm.source.trim(),
      description: manualForm.description.trim(),
    });
  };

  if (!isOfficer) {
    return (
      <Card className="max-w-lg mx-auto my-12 text-center p-8 border-slate-800">
        <h2 className="text-xl font-bold text-white mb-2">Officer Access Required</h2>
        <p className="text-sm text-slate-400 mb-4">
          The Treasurer Dashboard contains sensitive financial records and is restricted to club officers and admins.
        </p>
        <Link to="/">
          <Button variant="outline" size="sm">
            Back to Overview
          </Button>
        </Link>
      </Card>
    );
  }

  const breakdownList = summary?.breakdown || [];
  const maxCategoryAmount = Math.max(
    ...breakdownList.map((b) => Math.max(parseFloat(b.income || 0), parseFloat(b.expense || 0))),
    1
  );

  return (
    <div className="space-y-6">
      {/* Header & Main Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-surface-900 via-surface-850 to-brand-950/60 p-6 rounded-2xl border border-slate-800 shadow-xl">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              Live Central Ledger
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">Treasurer Dashboard</h1>
          <p className="text-sm text-slate-400 mt-1">
            Real-time financial breakdown, ledger reports, reimbursements, and CSV export.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Button variant="outline" size="sm" onClick={handleExportCSV}>
            📥 Download CSV
          </Button>
          <Button variant="primary" size="sm" onClick={() => setIsModalOpen(true)}>
            + Manual Transaction
          </Button>
        </div>
      </div>

      {/* Date Range Filter Bar */}
      <Card className="border-slate-800 bg-surface-900/60">
        <CardContent className="p-4 flex flex-col sm:flex-row items-end justify-between gap-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 flex-1">
            <Input
              label="Start Date"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="text-xs"
            />
            <Input
              label="End Date"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="text-xs"
            />
          </div>
          {(startDate || endDate) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setStartDate('');
                setEndDate('');
              }}
              className="text-xs text-slate-400 hover:text-white"
            >
              Reset Date Filter
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Top 3 Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        {/* Card 1: Total Income */}
        <Card className="border-emerald-500/30 bg-gradient-to-b from-surface-900 to-emerald-950/20 shadow-lg">
          <CardHeader className="pb-2">
            <CardDescription className="text-emerald-400 font-semibold text-xs tracking-wider uppercase">
              Total Inflow (Income)
            </CardDescription>
            <CardTitle className="text-3xl font-extrabold text-white mt-1">
              ${isSummaryLoading ? '...' : summary?.total_income || '0.00'}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-slate-400">
            Dues, ticket sales, merch orders, and cash donations
          </CardContent>
        </Card>

        {/* Card 2: Total Expense */}
        <Card className="border-rose-500/30 bg-gradient-to-b from-surface-900 to-rose-950/20 shadow-lg">
          <CardHeader className="pb-2">
            <CardDescription className="text-rose-400 font-semibold text-xs tracking-wider uppercase">
              Total Outflow (Expenses)
            </CardDescription>
            <CardTitle className="text-3xl font-extrabold text-white mt-1">
              ${isSummaryLoading ? '...' : summary?.total_expense || '0.00'}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-slate-400">
            Approved reimbursements and manual expense entries
          </CardContent>
        </Card>

        {/* Card 3: Net Cash Balance */}
        <Card className="border-brand-500/30 bg-gradient-to-b from-surface-900 to-brand-950/30 shadow-lg">
          <CardHeader className="pb-2">
            <CardDescription className="text-brand-300 font-semibold text-xs tracking-wider uppercase">
              Net Treasury Balance
            </CardDescription>
            <CardTitle className="text-3xl font-extrabold text-white mt-1">
              ${isSummaryLoading ? '...' : summary?.current_balance || '0.00'}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-slate-400">
            Current available net cash funds on hand
          </CardContent>
        </Card>
      </div>

      {/* Category Breakdown Progress Bars & Chart View */}
      <Card className="border-slate-800">
        <CardHeader>
          <CardTitle className="text-lg text-white">Category Financial Breakdown</CardTitle>
          <CardDescription className="text-xs">
            Comparison of inflows vs outflows across standard ledger categories.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isSummaryLoading ? (
            <div className="py-8 text-center text-slate-400 text-sm">Calculating category metrics...</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {breakdownList.map((cat) => {
                const income = parseFloat(cat.income || 0);
                const expense = parseFloat(cat.expense || 0);
                const incomePct = (income / maxCategoryAmount) * 100;
                const expensePct = (expense / maxCategoryAmount) * 100;

                return (
                  <div key={cat.category} className="p-4 rounded-xl bg-surface-950 border border-slate-800 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-sm text-slate-200">{cat.label}</span>
                      <span className="text-xs text-slate-400">{cat.count} transaction(s)</span>
                    </div>

                    {/* Progress Bars */}
                    <div className="space-y-1.5 pt-1">
                      {/* Income Bar */}
                      <div>
                        <div className="flex justify-between text-[11px] text-emerald-400 mb-0.5">
                          <span>Income</span>
                          <span>${cat.income}</span>
                        </div>
                        <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                          <div
                            className="bg-emerald-500 h-full rounded-full transition-all duration-300"
                            style={{ width: `${Math.min(incomePct, 100)}%` }}
                          />
                        </div>
                      </div>

                      {/* Expense Bar */}
                      <div>
                        <div className="flex justify-between text-[11px] text-rose-400 mb-0.5">
                          <span>Expense</span>
                          <span>${cat.expense}</span>
                        </div>
                        <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                          <div
                            className="bg-rose-500 h-full rounded-full transition-all duration-300"
                            style={{ width: `${Math.min(expensePct, 100)}%` }}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-between items-center text-xs pt-2 border-t border-slate-800/80 font-medium">
                      <span className="text-slate-400">Net Category Total</span>
                      <span className={parseFloat(cat.net) >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                        ${cat.net}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Filterable Transactions Table */}
      <Card className="border-slate-800">
        <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4">
          <div>
            <CardTitle className="text-lg text-white">Central Shared Ledger</CardTitle>
            <CardDescription className="text-xs">
              Live read-only transaction history populated by membership, events, store, reimbursements, and manual entries.
            </CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="text-xs py-1.5"
              options={[
                { value: '', label: 'All Types' },
                { value: 'income', label: 'Income Only' },
                { value: 'expense', label: 'Expense Only' },
              ]}
            />
            <Select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="text-xs py-1.5"
              options={[
                { value: '', label: 'All Categories' },
                { value: 'dues', label: 'Membership Dues' },
                { value: 'ticket', label: 'Event Tickets' },
                { value: 'merch', label: 'Merch Store' },
                { value: 'fundraiser', label: 'Fundraisers' },
                { value: 'reimbursement', label: 'Reimbursements' },
                { value: 'other', label: 'Other' },
              ]}
            />
            <div className="w-full sm:w-44">
              <Input
                type="text"
                placeholder="Search ledger..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="text-xs py-1.5"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isTxLoading ? (
            <div className="py-12 text-center text-slate-400 text-sm">Loading central ledger transactions...</div>
          ) : isTxError ? (
            <div className="py-8 text-center text-danger-300 text-sm">Failed to load transactions.</div>
          ) : transactions.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-sm">No transactions match the selected filters.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date / Timestamp</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Source Identifier</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.map((tx) => (
                  <TableRow key={tx.id} className="hover:bg-slate-800/40">
                    <TableCell className="text-xs font-mono text-slate-300 whitespace-nowrap">
                      {new Date(tx.date).toLocaleDateString()}{' '}
                      <span className="text-slate-500">{new Date(tx.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </TableCell>
                    <TableCell>
                      <Badge variant={tx.type === 'income' ? 'success' : 'danger'}>
                        {tx.type_display || tx.type}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs font-medium text-slate-200">
                      {tx.category_display || tx.category}
                    </TableCell>
                    <TableCell className="text-xs text-brand-300 font-medium max-w-[140px] truncate">
                      {tx.source}
                    </TableCell>
                    <TableCell className="text-xs text-slate-300 max-w-[220px] truncate">
                      {tx.description || '—'}
                    </TableCell>
                    <TableCell className={`text-right font-bold text-sm ${tx.type === 'income' ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {tx.type === 'income' ? '+' : '-'}${tx.amount}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Manual Entry Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Record Manual Transaction"
      >
        <form onSubmit={handleManualSubmit} className="space-y-4">
          <p className="text-xs text-slate-400">
            Use this form for off-platform cash donations, bake sales, or direct bank charges.
          </p>

          <Select
            label="Transaction Type"
            value={manualForm.type}
            onChange={(e) => setManualForm((prev) => ({ ...prev, type: e.target.value }))}
            options={[
              { value: 'income', label: 'Income (Inflow)' },
              { value: 'expense', label: 'Expense (Outflow)' },
            ]}
          />

          <Select
            label="Category"
            value={manualForm.category}
            onChange={(e) => setManualForm((prev) => ({ ...prev, category: e.target.value }))}
            options={[
              { value: 'fundraiser', label: 'Fundraiser' },
              { value: 'dues', label: 'Membership Dues (Manual)' },
              { value: 'ticket', label: 'Event Ticket (Manual)' },
              { value: 'merch', label: 'Merch Store (Manual)' },
              { value: 'reimbursement', label: 'Reimbursement' },
              { value: 'other', label: 'Other Miscellaneous' },
            ]}
          />

          <Input
            label="Amount ($)"
            type="number"
            step="0.01"
            placeholder="50.00"
            value={manualForm.amount}
            onChange={(e) => setManualForm((prev) => ({ ...prev, amount: e.target.value }))}
            error={formErrors.amount}
            required
          />

          <Input
            label="Source Identifier"
            type="text"
            placeholder="e.g. Spring Bake Sale Cash Box"
            value={manualForm.source}
            onChange={(e) => setManualForm((prev) => ({ ...prev, source: e.target.value }))}
            error={formErrors.source}
            required
          />

          <div className="space-y-1">
            <label className="block text-xs font-medium text-slate-300">Description / Note</label>
            <textarea
              rows="3"
              placeholder="Additional details regarding this entry..."
              value={manualForm.description}
              onChange={(e) => setManualForm((prev) => ({ ...prev, description: e.target.value }))}
              className="w-full px-3 py-2 rounded-xl bg-surface-950 border border-slate-700 text-white text-xs focus:outline-none focus:border-brand-500"
            />
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
            <Button type="button" variant="outline" size="sm" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm" isLoading={manualMutation.isPending}>
              Record Entry
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
