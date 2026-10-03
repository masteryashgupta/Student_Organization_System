import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../lib/AuthContext';
import { useToast } from '../../components/ui/Toast';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Button } from '../../components/ui/Button';
import { createAnnouncement, sendAnnouncement } from './announcementsApi';
import { Megaphone, ArrowLeft, Send, Mail, ShieldAlert, Sparkles } from 'lucide-react';

export default function ComposeAnnouncementPage() {
  const [formData, setFormData] = useState({
    title: '',
    body: '',
    audience: 'all',
    sendEmailNow: true,
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const { isOfficer } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const validate = () => {
    const errs = {};
    if (!formData.title.trim() || formData.title.trim().length < 3) {
      errs.title = 'Title must be at least 3 characters long';
    }
    if (!formData.body.trim() || formData.body.trim().length < 5) {
      errs.body = 'Body content must be at least 5 characters long';
    }
    if (!['all', 'members', 'volunteers'].includes(formData.audience)) {
      errs.audience = 'Please select a valid target audience';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);

    try {
      const created = await createAnnouncement({
        title: formData.title.trim(),
        body: formData.body.trim(),
        audience: formData.audience,
      });

      toast.success('Announcement published successfully!');

      if (formData.sendEmailNow && created?.id) {
        try {
          const sendRes = await sendAnnouncement(created.id);
          toast.success(sendRes.message || 'Email broadcast sent to members!');
        } catch (sendErr) {
          toast.error('Announcement saved, but email dispatch failed.');
        }
      }

      navigate('/announcements');
    } catch (err) {
      const respData = err.response?.data;
      if (respData?.details) {
        setErrors(respData.details);
      } else {
        const msg = respData?.message || respData?.detail || 'Failed to publish announcement.';
        toast.error(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  if (!isOfficer) {
    return (
      <div className="max-w-lg mx-auto my-12 animate-fade-in">
        <Card className="glass-panel text-center p-8 rounded-3xl border-rose-500/20 bg-rose-500/5 shadow-xl">
          <div className="w-12 h-12 rounded-2xl bg-rose-500/10 text-rose-500 flex items-center justify-center mx-auto mb-4">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Officer Access Required</h2>
          <p className="text-sm text-slate-600 dark:text-slate-300 mb-6 leading-relaxed">
            Only club officers and leaders are authorized to compose and dispatch announcements.
          </p>
          <Link to="/announcements">
            <Button variant="outline" size="sm" className="rounded-full">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Feed
            </Button>
          </Link>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-8 animate-fade-in">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-3xl glass-panel p-8 bg-gradient-to-r from-violet-500/10 via-purple-500/10 to-indigo-500/10 border border-violet-500/20">
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="p-2.5 rounded-2xl bg-violet-600/10 dark:bg-violet-400/10 text-violet-600 dark:text-violet-400">
                <Megaphone className="w-6 h-6" />
              </span>
              <span className="text-xs font-bold uppercase tracking-wider text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-950/40 px-3 py-1 rounded-full border border-violet-200 dark:border-violet-800/60">
                Officer Dispatch
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              Compose Announcement
            </h1>
            <p className="text-sm text-slate-600 dark:text-slate-300">
              Publish an official notice to the club board and email target member groups.
            </p>
          </div>
          <Link to="/announcements">
            <Button variant="outline" size="sm" className="rounded-full shadow-sm">
              <ArrowLeft className="w-4 h-4 mr-1.5" />
              Cancel
            </Button>
          </Link>
        </div>
      </div>

      <Card className="glass-panel rounded-3xl border border-white/20 dark:border-white/10 shadow-2xl overflow-hidden">
        <CardHeader className="p-6 sm:p-8 border-b border-slate-200/60 dark:border-slate-800/60 bg-slate-50/50 dark:bg-slate-900/30">
          <CardTitle className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-violet-600 dark:text-violet-400" />
            Announcement Details
          </CardTitle>
          <CardDescription className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Fill in the headline, message details, and target recipient audience.
          </CardDescription>
        </CardHeader>

        <CardContent className="p-6 sm:p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            <Input
              label="Announcement Title / Headline"
              name="title"
              type="text"
              placeholder="e.g. Next General Meeting Moved to Room 302"
              value={formData.title}
              onChange={handleChange}
              error={errors.title}
              className="rounded-2xl bg-white/80 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700/60"
              required
            />

            <Select
              label="Target Audience"
              name="audience"
              value={formData.audience}
              onChange={handleChange}
              options={[
                { value: 'all', label: 'All Club Members & Subscribers (Broadcast)' },
                { value: 'members', label: 'Active Members Only' },
                { value: 'volunteers', label: 'Volunteers Only' },
              ]}
              error={errors.audience}
              helperText="Determines who can see this notice in the feed and who receives the email notification."
              className="rounded-2xl bg-white/80 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700/60"
            />

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200">
                Message Body <span className="text-rose-500">*</span>
              </label>
              <textarea
                name="body"
                rows="6"
                placeholder="Write full announcement message details..."
                value={formData.body}
                onChange={handleChange}
                className="w-full px-4 py-3 rounded-2xl bg-white/80 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/60 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500 transition-all"
                required
              />
              {errors.body && <p className="text-xs text-rose-500 mt-1">{errors.body}</p>}
            </div>

            <div className="flex items-center gap-3 p-4 rounded-2xl bg-violet-500/5 border border-violet-500/10">
              <input
                type="checkbox"
                id="sendEmailNow"
                name="sendEmailNow"
                checked={formData.sendEmailNow}
                onChange={handleChange}
                className="w-4 h-4 rounded border-slate-300 dark:border-slate-600 text-violet-600 accent-violet-600 focus:ring-violet-500"
              />
              <label htmlFor="sendEmailNow" className="text-sm font-medium text-slate-800 dark:text-slate-200 flex items-center gap-2 cursor-pointer">
                <Mail className="w-4 h-4 text-violet-600 dark:text-violet-400" />
                Dispatch email broadcast to target audience immediately upon publishing
              </label>
            </div>

            <CardFooter className="px-0 pt-6 border-t border-slate-200/60 dark:border-slate-800/60 flex items-center justify-between">
              <Link to="/announcements">
                <Button type="button" variant="outline" size="sm" className="rounded-full">
                  Cancel
                </Button>
              </Link>
              <Button
                type="submit"
                variant="primary"
                size="sm"
                className="rounded-full bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white shadow-lg shadow-violet-600/25 font-semibold px-6 hover:scale-[1.02] transition-all"
                isLoading={loading}
              >
                <Send className="w-4 h-4 mr-2" />
                {formData.sendEmailNow ? 'Publish & Dispatch Email' : 'Save Notice'}
              </Button>
            </CardFooter>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
