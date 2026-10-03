import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { useAuth } from '../../lib/AuthContext';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../components/ui/Table';
import { getAnnouncements } from './announcementsApi';
import { Archive, ArrowLeft, PlusCircle, Search, Mail, Send, Calendar, User, Eye, EyeOff, Radio } from 'lucide-react';

export default function AnnouncementsArchivePage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedId, setExpandedId] = useState(null);

  const { isOfficer } = useAuth();

  const { data: announcements = [], isLoading, isError, refetch } = useQuery({
    queryKey: ['announcements', 'archive'],
    queryFn: () => getAnnouncements(),
  });

  const filteredArchive = announcements.filter((item) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      item.title?.toLowerCase().includes(q) ||
      item.body?.toLowerCase().includes(q) ||
      item.author_name?.toLowerCase().includes(q)
    );
  });

  const toggleExpand = (id) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-3xl glass-panel p-8 bg-gradient-to-r from-violet-500/10 via-purple-500/10 to-indigo-500/10 border border-violet-500/20">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="p-2.5 rounded-2xl bg-violet-600/10 dark:bg-violet-400/10 text-violet-600 dark:text-violet-400">
                <Archive className="w-6 h-6" />
              </span>
              <span className="text-xs font-bold uppercase tracking-wider text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-950/40 px-3 py-1 rounded-full border border-violet-200 dark:border-violet-800/60">
                Broadcast Log
              </span>
            </div>
            <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              Announcements Archive
            </h1>
            <p className="text-sm text-slate-600 dark:text-slate-300 max-w-2xl">
              Complete historical record of all club notices and broadcast dispatches with timestamps and distribution reach.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Link to="/announcements">
              <Button variant="outline" size="sm" className="rounded-full shadow-sm hover:scale-[1.02] transition-transform">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Feed
              </Button>
            </Link>
            {isOfficer && (
              <Link to="/announcements/compose">
                <Button
                  variant="primary"
                  size="sm"
                  className="rounded-full bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white shadow-lg shadow-violet-600/25 hover:scale-[1.02] transition-all"
                >
                  <PlusCircle className="w-4 h-4 mr-2" />
                  Compose Notice
                </Button>
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Main Glass Table Card */}
      <Card className="glass-panel rounded-3xl border border-white/20 dark:border-white/10 shadow-2xl overflow-hidden">
        <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 sm:p-8 border-b border-slate-200/60 dark:border-slate-800/60 bg-slate-50/50 dark:bg-slate-900/30">
          <div>
            <CardTitle className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Radio className="w-5 h-5 text-violet-600 dark:text-violet-400" />
              Broadcast Timeline
            </CardTitle>
            <CardDescription className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Showing {filteredArchive.length} historical record(s) ordered chronologically.
            </CardDescription>
          </div>
          <div className="w-full sm:w-72">
            <Input
              type="text"
              placeholder="Search by title, body, author..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="text-xs rounded-2xl bg-white/80 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700/60"
            />
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-16 text-center text-slate-500 dark:text-slate-400 text-sm animate-pulse">
              Loading broadcast records...
            </div>
          ) : isError ? (
            <div className="p-10 text-center text-rose-500 text-sm">
              Failed to load archive.{' '}
              <Button size="sm" variant="ghost" className="rounded-full" onClick={() => refetch()}>
                Retry
              </Button>
            </div>
          ) : filteredArchive.length === 0 ? (
            <div className="p-16 text-center text-slate-500 dark:text-slate-400 text-sm">
              No archive records found matching your query.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-b border-slate-200/60 dark:border-slate-800/60 bg-slate-50/40 dark:bg-slate-900/40">
                  <TableHead className="font-semibold text-slate-600 dark:text-slate-300">Date / Timestamp</TableHead>
                  <TableHead className="font-semibold text-slate-600 dark:text-slate-300">Headline / Title</TableHead>
                  <TableHead className="font-semibold text-slate-600 dark:text-slate-300">Target Audience</TableHead>
                  <TableHead className="font-semibold text-slate-600 dark:text-slate-300">Author</TableHead>
                  <TableHead className="font-semibold text-slate-600 dark:text-slate-300">Email Status</TableHead>
                  <TableHead className="font-semibold text-slate-600 dark:text-slate-300 text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredArchive.map((item) => {
                  const isExpanded = expandedId === item.id;
                  return (
                    <React.Fragment key={item.id}>
                      <TableRow className="hover:bg-violet-50/30 dark:hover:bg-violet-900/10 transition-colors border-b border-slate-200/40 dark:border-slate-800/40">
                        <TableCell className="text-xs font-mono text-slate-500 dark:text-slate-400 whitespace-nowrap">
                          {new Date(item.created_at).toLocaleDateString()}{' '}
                          <span className="text-slate-400 dark:text-slate-500">
                            {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </TableCell>
                        <TableCell className="font-bold text-slate-900 dark:text-white">
                          {item.title}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={item.audience === 'all' ? 'info' : item.audience === 'members' ? 'success' : 'accent'}
                            className="rounded-full text-xs font-medium"
                          >
                            {item.audience_display || item.audience}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs text-slate-600 dark:text-slate-300 font-medium">
                          {item.author_name}
                        </TableCell>
                        <TableCell>
                          {item.is_sent ? (
                            <span className="inline-flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-semibold bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
                              <Send className="w-3 h-3" /> Sent
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400 font-semibold bg-amber-500/10 px-2.5 py-1 rounded-full border border-amber-500/20">
                              Draft
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="rounded-full text-xs text-violet-600 dark:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-950/40 font-semibold"
                            onClick={() => toggleExpand(item.id)}
                          >
                            {isExpanded ? (
                              <>
                                <EyeOff className="w-3.5 h-3.5 mr-1" /> Hide
                              </>
                            ) : (
                              <>
                                <Eye className="w-3.5 h-3.5 mr-1" /> Read
                              </>
                            )}
                          </Button>
                        </TableCell>
                      </TableRow>
                      {isExpanded && (
                        <TableRow className="bg-slate-50/80 dark:bg-slate-900/60 border-t border-b border-violet-500/20">
                          <TableCell colSpan={6} className="p-6">
                            <div className="glass-card p-6 rounded-2xl border border-violet-500/20 space-y-3 shadow-md">
                              <div className="flex items-center justify-between border-b border-slate-200/60 dark:border-slate-700/60 pb-2">
                                <h4 className="text-sm font-bold text-violet-700 dark:text-violet-300 flex items-center gap-2">
                                  <Mail className="w-4 h-4" /> Message Body
                                </h4>
                                <span className="text-xs text-slate-500 dark:text-slate-400">
                                  Target: {item.audience_display || item.audience}
                                </span>
                              </div>
                              <p className="text-sm text-slate-700 dark:text-slate-200 whitespace-pre-line leading-relaxed">
                                {item.body}
                              </p>
                              {item.sent_at && (
                                <p className="text-xs text-slate-500 dark:text-slate-400 pt-3 border-t border-slate-200/40 dark:border-slate-700/40 flex items-center gap-1.5">
                                  <Send className="w-3.5 h-3.5 text-emerald-500" />
                                  Email broadcast delivered on: {new Date(item.sent_at).toLocaleString()}
                                </p>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </React.Fragment>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
