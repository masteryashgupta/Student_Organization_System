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
          <label className="block text-xs font-semibold text-[#0F172A] mb-1.5">
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
          <label className="block text-xs font-semibold text-[#0F172A] mb-1.5">
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
          <label className="block text-xs font-semibold text-[#0F172A] mb-1.5">
            Project Description & Objectives
          </label>
          <textarea
            rows={3}
            placeholder="Objectives, logistics, target date, and volunteer expectations..."
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            className="w-full bg-white border border-slate-200 rounded-xl p-3 text-xs text-[#0F172A] placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#714B67]/20 focus:border-[#714B67] transition-all resize-none"
          />
        </div>

        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
          <Button variant="ghost" type="button" onClick={onClose} disabled={isPending}>
            Cancel
          </Button>
          <Button variant="primary" type="submit" disabled={isPending}>
            {isPending ? 'Creating...' : 'Create Project'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
