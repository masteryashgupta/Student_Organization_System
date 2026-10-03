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
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white">Announcements Archive</h1>
          <p className="text-sm text-slate-400 mt-1">
            Complete historical record of all club notices and broadcast dispatches with timestamps.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link to="/announcements">
            <Button variant="outline" size="sm">
              Back to Feed
            </Button>
          </Link>
          {isOfficer && (
            <Link to="/announcements/compose">
              <Button variant="primary" size="sm">
                + Compose Notice
              </Button>
            </Link>
          )}
        </div>
      </div>

      <Card className="border-slate-800">
        <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4">
          <div>
            <CardTitle className="text-base text-white">Broadcast Timeline</CardTitle>
            <CardDescription className="text-xs">
              Showing {filteredArchive.length} historical record(s) ordered by creation timestamp.
            </CardDescription>
          </div>
          <div className="w-full sm:w-64">
            <Input
              type="text"
              placeholder="Search archive..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="text-xs py-1.5"
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 text-center text-slate-400 text-sm">Loading archive records...</div>
          ) : isError ? (
            <div className="p-6 text-center text-danger-300 text-sm">
              Failed to load archive. <Button size="sm" variant="ghost" onClick={() => refetch()}>Retry</Button>
            </div>
          ) : filteredArchive.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-sm">No archive records found.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date / Timestamp</TableHead>
                  <TableHead>Headline / Title</TableHead>
                  <TableHead>Target Audience</TableHead>
                  <TableHead>Author</TableHead>
                  <TableHead>Email Status</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredArchive.map((item) => (
                  <React.Fragment key={item.id}>
                    <TableRow className="hover:bg-slate-800/40">
                      <TableCell className="text-xs font-mono text-slate-300 whitespace-nowrap">
                        {new Date(item.created_at).toLocaleDateString()}{' '}
                        <span className="text-slate-500">{new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </TableCell>
                      <TableCell className="font-medium text-white">
                        {item.title}
                      </TableCell>
                      <TableCell>
                        <Badge variant={item.audience === 'all' ? 'info' : item.audience === 'members' ? 'success' : 'accent'}>
                          {item.audience_display || item.audience}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-slate-300">
                        {item.author_name}
                      </TableCell>
                      <TableCell>
                        {item.is_sent ? (
                          <span className="text-xs text-emerald-400 font-medium">✓ Sent</span>
                        ) : (
                          <span className="text-xs text-amber-400">Draft</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-xs text-brand-400 py-1 px-2"
                          onClick={() => toggleExpand(item.id)}
                        >
                          {expandedId === item.id ? 'Hide' : 'Read'}
                        </Button>
                      </TableCell>
                    </TableRow>
                    {expandedId === item.id && (
                      <TableRow className="bg-surface-950/80 border-t border-slate-800">
                        <TableCell colSpan={6} className="p-4">
                          <div className="bg-surface-900 p-4 rounded-xl border border-slate-800 space-y-2">
                            <h4 className="text-sm font-semibold text-brand-300">Full Message Body</h4>
                            <p className="text-xs text-slate-300 whitespace-pre-line leading-relaxed">
                              {item.body}
                            </p>
                            {item.sent_at && (
                              <p className="text-[11px] text-slate-500 pt-2 border-t border-slate-800">
                                Email dispatch timestamp: {new Date(item.sent_at).toLocaleString()}
                              </p>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </React.Fragment>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
