import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../lib/AuthContext';
import { useToast } from '../../components/ui/Toast';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Button } from '../../components/ui/Button';
import { createAnnouncement, sendAnnouncement } from './announcementsApi';

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
      <Card className="max-w-lg mx-auto my-12 text-center p-8 border-slate-800">
        <h2 className="text-xl font-bold text-white mb-2">Officer Access Required</h2>
        <p className="text-sm text-slate-400 mb-4">
          Only club officers and leaders are authorized to compose and dispatch announcements.
        </p>
        <Link to="/announcements">
          <Button variant="outline" size="sm">
            Back to Feed
          </Button>
        </Link>
      </Card>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Compose Announcement</h1>
          <p className="text-sm text-slate-400">
            Publish an official notice to the club board and email target member groups.
          </p>
        </div>
        <Link to="/announcements">
          <Button variant="ghost" size="sm">
            Cancel
          </Button>
        </Link>
      </div>

      <Card className="border-slate-800">
        <CardHeader>
          <CardTitle className="text-lg">Announcement Details</CardTitle>
          <CardDescription>
            Fill in the headline, message details, and target recipient audience.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Announcement Title / Headline"
              name="title"
              type="text"
              placeholder="e.g. Next General Meeting Moved to Room 302"
              value={formData.title}
              onChange={handleChange}
              error={errors.title}
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
            />

            <div className="space-y-1">
              <label className="block text-xs font-medium text-slate-300">
                Message Body <span className="text-danger-400">*</span>
              </label>
              <textarea
                name="body"
                rows="6"
                placeholder="Write full announcement message details..."
                value={formData.body}
                onChange={handleChange}
                className="w-full px-3.5 py-2.5 rounded-xl bg-surface-950 border border-slate-700/80 text-white text-sm focus:outline-none focus:border-brand-500 transition-colors"
                required
              />
              {errors.body && <p className="text-xs text-danger-400">{errors.body}</p>}
            </div>

            <div className="flex items-center gap-3 pt-2">
              <input
                type="checkbox"
                id="sendEmailNow"
                name="sendEmailNow"
                checked={formData.sendEmailNow}
                onChange={handleChange}
                className="w-4 h-4 rounded border-slate-700 bg-surface-950 text-brand-600 focus:ring-brand-500"
              />
              <label htmlFor="sendEmailNow" className="text-sm text-slate-300">
                Dispatch email broadcast to target audience immediately upon publishing
              </label>
            </div>

            <CardFooter className="px-0 pt-4 border-t border-slate-800/80 flex items-center justify-between">
              <Link to="/announcements">
                <Button type="button" variant="outline" size="sm">
                  Cancel
                </Button>
              </Link>
              <Button type="submit" variant="primary" size="sm" isLoading={loading}>
                {formData.sendEmailNow ? 'Publish & Send Email' : 'Save as Announcement'}
              </Button>
            </CardFooter>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
