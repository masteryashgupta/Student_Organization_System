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
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 sm:p-8 rounded-2xl border border-border shadow-odoo-card">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#714B67]/10 text-[#714B67] border border-[#714B67]/20">
              Club Broadcast Center
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#222222] tracking-tight">Announcements Feed</h1>
          <p className="text-sm text-[#66636A] mt-1">
            Official club notices, event alerts, and meeting agendas for all members.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link to="/announcements/archive">
            <Button variant="outline" size="sm">
              View Archive
            </Button>
          </Link>
          {isOfficer && (
            <Link to="/announcements/compose">
              <Button variant="primary" size="sm" className="bg-[#714B67] hover:bg-[#5B3B52] text-white shadow-sm">
                + Compose Notice
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* Mailing List Subscription Box & Filters */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Feed Column */}
        <div className="lg:col-span-2 space-y-4">
          {/* Controls Bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-[#F4F6F8] p-3 rounded-xl border border-border">
            {/* Audience Tabs */}
            <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0">
              <button
                onClick={() => setSelectedAudience('')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  selectedAudience === ''
                    ? 'bg-[#714B67] text-white font-semibold shadow-sm'
                    : 'text-[#66636A] hover:text-[#222222] hover:bg-white'
                }`}
              >
                All Audiences
              </button>
              <button
                onClick={() => setSelectedAudience('all')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  selectedAudience === 'all'
                    ? 'bg-[#714B67] text-white font-semibold shadow-sm'
                    : 'text-[#66636A] hover:text-[#222222] hover:bg-white'
                }`}
              >
                Everyone
              </button>
              <button
                onClick={() => setSelectedAudience('members')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  selectedAudience === 'members'
                    ? 'bg-[#714B67] text-white font-semibold shadow-sm'
                    : 'text-[#66636A] hover:text-[#222222] hover:bg-white'
                }`}
              >
                Members Only
              </button>
              <button
                onClick={() => setSelectedAudience('volunteers')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  selectedAudience === 'volunteers'
                    ? 'bg-[#714B67] text-white font-semibold shadow-sm'
                    : 'text-[#66636A] hover:text-[#222222] hover:bg-white'
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
                className="py-1 text-xs bg-white border-border text-[#222222]"
              />
            </div>
          </div>

          {/* Announcements Feed Items */}
          {isLoading ? (
            <div className="py-12 text-center text-[#66636A]">Loading announcements feed...</div>
          ) : isError ? (
            <div className="p-4 rounded-xl bg-danger-50 border border-danger-200 text-danger-700 text-sm flex justify-between items-center">
              <span>Failed to load announcements from server.</span>
              <Button size="sm" variant="ghost" onClick={() => refetch()}>
                Retry
              </Button>
            </div>
          ) : filteredAnnouncements.length === 0 ? (
            <Card className="py-12 text-center bg-white border-border shadow-sm">
              <p className="text-[#66636A] text-sm">No announcements found matching your filter.</p>
              {isOfficer && (
                <Link to="/announcements/compose" className="mt-3 inline-block">
                  <Button variant="outline" size="sm">
                    Create First Announcement
                  </Button>
                </Link>
              )}
            </Card>
          ) : (
            filteredAnnouncements.map((item) => (
              <Card key={item.id} className="border-border bg-white shadow-odoo-card hover:shadow-md transition-all">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2 mb-1.5">
                        <Badge variant={getAudienceBadgeVariant(item.audience)}>
                          {item.audience_display || item.audience}
                        </Badge>
                        {item.is_sent ? (
                          <span className="text-[11px] font-medium text-emerald-800 flex items-center gap-1 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                            ✓ Emailed on {new Date(item.sent_at).toLocaleDateString()}
                          </span>
                        ) : (
                          <span className="text-[11px] font-medium text-amber-800 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200">
                            Draft Notice
                          </span>
                        )}
                      </div>
                      <CardTitle className="text-lg text-[#222222] font-bold">{item.title}</CardTitle>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="py-2">
                  <p className="text-[#222222] text-sm whitespace-pre-line leading-relaxed">{item.body}</p>
                </CardContent>
                <CardFooter className="pt-3 border-t border-border flex items-center justify-between text-xs text-[#66636A]">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-[#222222]">{item.author_name}</span>
                    <span>•</span>
                    <span>{new Date(item.created_at).toLocaleString()}</span>
                  </div>
                  {isOfficer && (
                    <Button
                      variant={item.is_sent ? 'secondary' : 'primary'}
                      size="sm"
                      className={`text-xs py-1 ${!item.is_sent ? 'bg-[#714B67] hover:bg-[#5B3B52] text-white shadow-sm' : ''}`}
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
        <div className="space-y-4">
          <Card className="border-[#714B67]/20 bg-[#714B67]/5 shadow-sm">
            <CardHeader>
              <CardTitle className="text-base text-[#222222]">Join Club Mailing List</CardTitle>
              <CardDescription className="text-xs text-[#66636A]">
                Receive important announcements directly in your email inbox automatically.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubscribe} className="space-y-3">
                <Input
                  type="email"
                  placeholder="your.name@student.edu"
                  value={subscribeEmailInput}
                  onChange={(e) => setSubscribeEmailInput(e.target.value)}
                  required
                  className="text-xs bg-white border-border text-[#222222]"
                />
                <Button
                  type="submit"
                  variant="primary"
                  className="w-full text-xs bg-[#714B67] hover:bg-[#5B3B52] text-white font-semibold"
                  isLoading={submittingSub}
                >
                  Subscribe to Updates
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Value Prop Banner */}
          <Card className="border-border bg-white shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-bold text-[#222222]">
                Why One Unified Broadcast Board?
              </CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-[#66636A] space-y-2">
              <p>
                No more copy-pasting meeting notices across multiple fragmented WhatsApp or Discord groups.
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
