import React, { useState } from 'react';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Target, DollarSign, AlertCircle } from 'lucide-react';

export default function ProjectModal({
  isOpen,
  onClose,
  onSubmit,
  isPending,
}) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    goal_amount: '500.00',
    status: 'active',
  });

  const [errors, setErrors] = useState({});

  const validate = () => {
    const errs = {};
    if (!formData.name.trim()) errs.name = 'Fundraiser / Project name is required.';
    if (isNaN(formData.goal_amount) || Number(formData.goal_amount) < 0) {
      errs.goal_amount = 'Goal amount must be a positive number.';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;

    const payload = {
      name: formData.name.trim(),
      description: formData.description.trim(),
      goal_amount: parseFloat(formData.goal_amount || 0).toFixed(2),
      status: formData.status,
    };

    onSubmit(payload);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Create New Fundraiser / Project"
    >
      <form onSubmit={handleSubmit} className="space-y-4 text-xs">
        <div>
          <label className="block text-xs font-bold text-slate-900 dark:text-white mb-1.5">
            Project / Fundraiser Name *
          </label>
          <Input
            type="text"
            placeholder="e.g. Annual Spring Bake Sale, Charity Car Wash, Hackathon Sponsorship"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            error={errors.name}
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-900 dark:text-white mb-1.5">
            Fundraising Goal ($)
          </label>
          <Input
            type="number"
            step="0.01"
            min="0"
            placeholder="500.00"
            value={formData.goal_amount}
            onChange={(e) => setFormData({ ...formData, goal_amount: e.target.value })}
            error={errors.goal_amount}
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-900 dark:text-white mb-1.5">
            Project Description & Objectives
          </label>
          <textarea
            rows={3}
            placeholder="Objectives, logistics, target date, and volunteer expectations..."
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            className="w-full bg-white/80 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80 rounded-2xl p-3.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#714B67] dark:focus:ring-purple-400 transition-all resize-none font-medium"
          />
        </div>

        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200/60 dark:border-slate-800/60">
          <Button variant="ghost" type="button" onClick={onClose} disabled={isPending} className="rounded-full">
            Cancel
          </Button>
          <Button variant="primary" type="submit" disabled={isPending} className="rounded-full bg-gradient-to-r from-[#714B67] to-[#8C5D80] text-white font-bold">
            {isPending ? 'Creating...' : 'Create Project'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
