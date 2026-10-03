import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { useAuth } from '../../lib/AuthContext';
import { useToast } from '../../components/ui/Toast';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { getAnnouncements, sendAnnouncement, subscribeEmail } from './announcementsApi';

export default function AnnouncementsFeedPage() {
  const [selectedAudience, setSelectedAudience] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [subscribeEmailInput, setSubscribeEmailInput] = useState('');
  const [submittingSub, setSubmittingSub] = useState(false);

  const { isOfficer } = useAuth();
  const toast = useToast();
  const queryClient = useQueryClient();

  const { data: announcements = [], isLoading, isError, refetch } = useQuery({
    queryKey: ['announcements', selectedAudience],
    queryFn: () => getAnnouncements(selectedAudience ? { audience: selectedAudience } : {}),
  });

  const sendMutation = useMutation({
    mutationFn: (id) => sendAnnouncement(id),
    onSuccess: (data) => {
      toast.success(data.message || 'Email broadcast sent successfully!');
      queryClient.invalidateQueries({ queryKey: ['announcements'] });
    },
    onError: (err) => {
      const msg = err.response?.data?.detail || 'Failed to dispatch email broadcast.';
      toast.error(msg);
    },
  });

  const handleSubscribe = async (e) => {
    e.preventDefault();
    if (!subscribeEmailInput || !subscribeEmailInput.includes('@')) {
      toast.error('Please enter a valid email address.');
      return;
    }
    setSubmittingSub(true);
    try {
      await subscribeEmail(subscribeEmailInput);
      toast.success('Successfully subscribed to Skyline Club announcements!');
      setSubscribeEmailInput('');
    } catch (err) {
      const msg = err.response?.data?.email?.[0] || err.response?.data?.detail || 'Subscription failed or email already registered.';
      toast.error(msg);
    } finally {
      setSubmittingSub(false);
    }
  };

  const filteredAnnouncements = announcements.filter((item) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      item.title?.toLowerCase().includes(q) ||
      item.body?.toLowerCase().includes(q) ||
      item.author_name?.toLowerCase().includes(q)
    );
  });

  const getAudienceBadgeVariant = (audience) => {
    switch (audience) {
      case 'all':
        return 'info';
      case 'members':
        return 'success';
      case 'volunteers':
        return 'accent';
      default:
        return 'neutral';
    }
  };

  return (
    <div className="space-y-8 animate-fadeIn pb-16">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 glass-panel p-6 sm:p-8 rounded-3xl border border-white/40 dark:border-slate-800/80 shadow-xl">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="px-3.5 py-1 rounded-full text-xs font-bold bg-brand-500/10 dark:bg-brand-500/20 text-brand-700 dark:text-brand-300 border border-brand-500/30 shadow-sm">
              Club Broadcast Center
            </span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">Announcements Feed</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Official club notices, event alerts, and meeting agendas for all members.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link to="/announcements/archive">
            <Button variant="outline" size="sm" className="rounded-full font-bold border-slate-200/80 dark:border-slate-700/80 hover:bg-slate-100 dark:hover:bg-slate-800">
              View Archive
            </Button>
          </Link>
          {isOfficer && (
            <Link to="/announcements/compose">
              <Button variant="primary" size="sm" className="rounded-full bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 text-white shadow-lg shadow-brand-500/25 font-bold">
                + Compose Notice
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* Mailing List Subscription Box & Filters */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Feed Column */}
        <div className="lg:col-span-2 space-y-5">
          {/* Controls Bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 glass-card bg-slate-100/70 dark:bg-slate-900/60 p-3 rounded-2xl border border-slate-200/80 dark:border-slate-800/80">
            {/* Audience Tabs */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
              <button
                onClick={() => setSelectedAudience('')}
                className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all whitespace-nowrap ${
                  selectedAudience === ''
                    ? 'bg-gradient-to-r from-brand-600 to-indigo-600 text-white shadow-md shadow-brand-500/20'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                All Audiences
              </button>
              <button
                onClick={() => setSelectedAudience('all')}
                className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all whitespace-nowrap ${
                  selectedAudience === 'all'
                    ? 'bg-gradient-to-r from-brand-600 to-indigo-600 text-white shadow-md shadow-brand-500/20'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Everyone
              </button>
              <button
                onClick={() => setSelectedAudience('members')}
                className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all whitespace-nowrap ${
                  selectedAudience === 'members'
                    ? 'bg-gradient-to-r from-brand-600 to-indigo-600 text-white shadow-md shadow-brand-500/20'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Members Only
              </button>
              <button
                onClick={() => setSelectedAudience('volunteers')}
                className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all whitespace-nowrap ${
                  selectedAudience === 'volunteers'
                    ? 'bg-gradient-to-r from-brand-600 to-indigo-600 text-white shadow-md shadow-brand-500/20'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Volunteers
              </button>
            </div>

            {/* Search Input */}
            <div className="w-full sm:w-48">
              <Input
                type="text"
                placeholder="Search feed..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="py-1.5 text-xs bg-white/80 dark:bg-slate-800/80 border-slate-200/80 dark:border-slate-700/80 text-slate-900 dark:text-white"
              />
            </div>
          </div>

          {/* Announcements Feed Items */}
          {isLoading ? (
            <div className="py-12 text-center text-slate-400">Loading announcements feed...</div>
          ) : isError ? (
            <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-300/40 dark:border-rose-900/50 text-rose-700 dark:text-rose-300 text-sm flex justify-between items-center">
              <span>Failed to load announcements from server.</span>
              <Button size="sm" variant="ghost" onClick={() => refetch()} className="rounded-full">
                Retry
              </Button>
            </div>
          ) : filteredAnnouncements.length === 0 ? (
            <Card className="py-16 text-center glass-panel rounded-3xl border border-white/40 dark:border-slate-800/80 shadow-xl">
              <p className="text-slate-500 dark:text-slate-400 text-sm">No announcements found matching your filter.</p>
              {isOfficer && (
                <Link to="/announcements/compose" className="mt-4 inline-block">
                  <Button variant="outline" size="sm" className="rounded-full font-bold">
                    Create First Announcement
                  </Button>
                </Link>
              )}
            </Card>
          ) : (
            filteredAnnouncements.map((item) => (
              <Card key={item.id} className="glass-panel border-white/40 dark:border-slate-800/80 rounded-3xl shadow-xl hover:shadow-2xl transition-all duration-300">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant={getAudienceBadgeVariant(item.audience)} className="rounded-full px-3">
                          {item.audience_display || item.audience}
                        </Badge>
                        {item.is_sent ? (
                          <span className="text-[11px] font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-1 bg-emerald-500/10 dark:bg-emerald-500/20 px-3 py-0.5 rounded-full border border-emerald-500/30">
                            ✓ Emailed on {new Date(item.sent_at).toLocaleDateString()}
                          </span>
                        ) : (
                          <span className="text-[11px] font-bold text-amber-800 dark:text-amber-300 bg-amber-500/10 dark:bg-amber-500/20 px-3 py-0.5 rounded-full border border-amber-500/30">
                            Draft Notice
                          </span>
                        )}
                      </div>
                      <CardTitle className="text-xl font-extrabold text-slate-900 dark:text-white">{item.title}</CardTitle>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="py-2">
                  <p className="text-slate-700 dark:text-slate-200 text-sm whitespace-pre-line leading-relaxed">{item.body}</p>
                </CardContent>
                <CardFooter className="pt-4 border-t border-slate-200/60 dark:border-slate-800/60 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                  <div className="flex items-center gap-2 font-medium">
                    <span className="font-bold text-slate-900 dark:text-white">{item.author_name}</span>
                    <span>•</span>
                    <span>{new Date(item.created_at).toLocaleString()}</span>
                  </div>
                  {isOfficer && (
                    <Button
                      variant={item.is_sent ? 'secondary' : 'primary'}
                      size="sm"
                      className={`rounded-full text-xs py-1.5 px-4 font-bold ${!item.is_sent ? 'bg-gradient-to-r from-brand-600 to-indigo-600 text-white shadow-md shadow-brand-500/20' : ''}`}
                      isLoading={sendMutation.isPending && sendMutation.variables === item.id}
                      onClick={() => sendMutation.mutate(item.id)}
                    >
                      {item.is_sent ? 'Re-send Email' : 'Dispatch Email Now'}
                    </Button>
                  )}
                </CardFooter>
              </Card>
            ))
          )}
        </div>

        {/* Sidebar Column: Email Mailing List Subscription */}
        <div className="space-y-5">
          <Card className="glass-panel border-brand-500/30 dark:border-brand-500/30 bg-brand-500/5 shadow-xl rounded-3xl">
            <CardHeader>
              <CardTitle className="text-lg font-extrabold text-slate-900 dark:text-white">Join Club Mailing List</CardTitle>
              <CardDescription className="text-xs text-slate-500 dark:text-slate-400">
                Receive important announcements directly in your email inbox automatically.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubscribe} className="space-y-3.5">
                <Input
                  type="email"
                  placeholder="your.name@student.edu"
                  value={subscribeEmailInput}
                  onChange={(e) => setSubscribeEmailInput(e.target.value)}
                  required
                  className="text-xs"
                />
                <Button
                  type="submit"
                  variant="primary"
                  className="w-full rounded-full bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 text-white font-bold shadow-md shadow-brand-500/25 active:scale-95 transition-transform"
                  isLoading={submittingSub}
                >
                  Subscribe to Updates
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Value Prop Banner */}
          <Card className="glass-panel border-white/40 dark:border-slate-800/80 rounded-3xl shadow-xl">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-extrabold text-slate-900 dark:text-white">
                Why One Unified Broadcast Board?
              </CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-slate-500 dark:text-slate-400 space-y-2.5 leading-relaxed">
              <p>
                No more copy-pasting meeting notices across multiple fragmented chat apps.
              </p>
              <p>
                Every notice is published once to the central database, permanently archived with timestamps, and automatically emailed to targeted member lists.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
