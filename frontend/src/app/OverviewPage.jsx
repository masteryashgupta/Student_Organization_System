import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../lib/AuthContext';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';

export default function OverviewPage() {
  const { user, isAuthenticated, isOfficer } = useAuth();

  return (
    <div className="space-y-8">
      {/* Welcome Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-brand-900 via-surface-900 to-accent-950 p-8 border border-brand-500/30 shadow-2xl">
        <div className="relative z-10 max-w-2xl space-y-3">
          <div className="inline-flex items-center gap-2">
            <Badge variant="primary" size="md">Phase 0 Initialized</Badge>
            {isOfficer && <Badge variant="warning" size="md">Officer Level</Badge>}
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
            Welcome to Skyline Student Association
          </h1>
          <p className="text-slate-300 text-base leading-relaxed">
            A single unified platform for managing events, membership dues, merchandise sales, volunteer task boards, and central financial accounting.
          </p>
          {!isAuthenticated && (
            <div className="pt-3 flex gap-3">
              <Link to="/register">
                <Button variant="primary">Join Association</Button>
              </Link>
              <Link to="/login">
                <Button variant="outline">Sign In</Button>
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Feature Modules Overview Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card className="hover:border-brand-500/50 transition-all">
          <CardHeader>
            <CardTitle>Platform & Membership</CardTitle>
            <CardDescription>Person 1 Scope</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-slate-300">
            <p>&bull; Custom user accounts & JWT authentication</p>
            <p>&bull; Central financial transaction ledger</p>
            <p>&bull; Member tier discounts & door verification</p>
          </CardContent>
        </Card>

        <Card className="hover:border-accent-500/50 transition-all">
          <CardHeader>
            <CardTitle>Events & Ticketing</CardTitle>
            <CardDescription>Person 2 Scope</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-slate-300">
            <p>&bull; Online event tickets & capacity tracking</p>
            <p>&bull; Member discount calculations</p>
            <p>&bull; Door check-in scanning & live counters</p>
          </CardContent>
        </Card>

        <Card className="hover:border-emerald-500/50 transition-all">
          <CardHeader>
            <CardTitle>Store & Tasks</CardTitle>
            <CardDescription>Person 3 Scope</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-slate-300">
            <p>&bull; Hoodies & merch inventory management</p>
            <p>&bull; Order checkout & revenue integration</p>
            <p>&bull; Volunteer Kanban task board</p>
          </CardContent>
        </Card>

        <Card className="hover:border-amber-500/50 transition-all">
          <CardHeader>
            <CardTitle>Finance & Comms</CardTitle>
            <CardDescription>Person 4 Scope</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-slate-300">
            <p>&bull; Executive treasury dashboard</p>
            <p>&bull; Member reimbursements approval</p>
            <p>&bull; Announcements & broadcast mailing lists</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
