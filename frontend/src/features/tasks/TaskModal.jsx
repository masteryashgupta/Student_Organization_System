import React, { useState, useEffect } from 'react';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Tag, Calendar, User as UserIcon, AlertCircle, Sparkles } from 'lucide-react';

export default function TaskModal({
  isOpen,
  onClose,
  task = null, // null for create mode, object for edit mode
  projects = [],
  assignees = [],
  initialProjectId = null,
  initialStatus = 'todo',
  onSubmit,
  isPending,
}) {
  const [formData, setFormData] = useState({
    project: initialProjectId || (projects[0]?.id || ''),
    title: '',
    description: '',
    assignee: '',
    priority: 'medium',
    status: initialStatus || 'todo',
    due_date: '',
  });

  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (task) {
      setFormData({
        project: task.project || (projects[0]?.id || ''),
        title: task.title || '',
        description: task.description || '',
        assignee: task.assignee || '',
        priority: task.priority || 'medium',
        status: task.status || 'todo',
        due_date: task.due_date || '',
      });
    } else {
      setFormData({
        project: initialProjectId || (projects[0]?.id || ''),
        title: '',
        description: '',
        assignee: '',
        priority: 'medium',
        status: initialStatus || 'todo',
        due_date: '',
      });
    }
    setErrors({});
  }, [task, isOpen, initialProjectId, initialStatus, projects]);

  const validate = () => {
    const errs = {};
    if (!formData.project) errs.project = 'Please select a parent project.';
    if (!formData.title.trim()) errs.title = 'Task title is required.';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;

    const payload = {
      project: Number(formData.project),
      title: formData.title.trim(),
      description: formData.description.trim(),
      assignee: formData.assignee ? Number(formData.assignee) : null,
      priority: formData.priority,
      status: formData.status,
      due_date: formData.due_date || null,
    };

    onSubmit(payload);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={task ? 'Edit Volunteer Task' : 'Create New Volunteer Task'}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Project Selector */}
        <div>
          <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
            Parent Project / Fundraiser *
          </label>
          <select
            value={formData.project}
            onChange={(e) => setFormData({ ...formData, project: e.target.value })}
            className="w-full bg-surface-950 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-brand-500 transition-colors"
          >
            <option value="" disabled>Select a project...</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} {p.goal_amount > 0 ? `($${Number(p.goal_amount).toFixed(0)} Goal)` : ''}
              </option>
            ))}
          </select>
          {errors.project && (
            <p className="text-xs text-rose-400 mt-1 flex items-center gap-1">
              <AlertCircle className="w-3 h-3" /> {errors.project}
            </p>
          )}
        </div>

        {/* Task Title */}
        <div>
          <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
            Task Action Title *
          </label>
          <Input
            type="text"
            placeholder="e.g. Bake 3 dozen cookies, Buy napkins, Run table 12-2pm"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            error={errors.title}
          />
        </div>

        {/* Description */}
        <div>
          <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
            Instructions & Details (Optional)
          </label>
          <textarea
            rows={3}
            placeholder="Detailed recipe, schedule, shift location, or specific materials needed..."
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            className="w-full bg-surface-950 border border-slate-700 rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-brand-500 transition-colors resize-none"
          />
        </div>

        {/* Two-Column Grid: Assignee & Priority */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Assignee */}
          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
              Assigned Volunteer
            </label>
            <select
              value={formData.assignee}
              onChange={(e) => setFormData({ ...formData, assignee: e.target.value })}
              className="w-full bg-surface-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-brand-500 transition-colors"
            >
              <option value="">-- Open Slot (Unassigned) --</option>
              {assignees.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.display_name || user.name || user.username} ({user.role || 'member'})
                </option>
              ))}
            </select>
            <span className="text-[10px] text-slate-400 mt-1 block">
              Leave unassigned for volunteers to self-claim.
            </span>
          </div>

          {/* Priority */}
          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
              Priority
            </label>
            <select
              value={formData.priority}
              onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
              className="w-full bg-surface-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-brand-500 transition-colors"
            >
              <option value="low">Low Priority</option>
              <option value="medium">Medium Priority</option>
              <option value="high">High Priority</option>
              <option value="urgent">Urgent</option>
            </select>
          </div>
        </div>

        {/* Two-Column Grid: Due Date & Status */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Due Date */}
          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
              Target Due Date
            </label>
            <Input
              type="date"
              value={formData.due_date}
              onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
            />
          </div>

          {/* Status */}
          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
              Initial Column
            </label>
            <select
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              className="w-full bg-surface-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-brand-500 transition-colors"
            >
              <option value="todo">To Do</option>
              <option value="doing">In Progress (Doing)</option>
              <option value="done">Completed (Done)</option>
            </select>
          </div>
        </div>

        {/* Modal Actions */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
          <Button variant="ghost" type="button" onClick={onClose} disabled={isPending}>
            Cancel
          </Button>
          <Button variant="primary" type="submit" disabled={isPending}>
            {isPending ? 'Saving...' : task ? 'Save Changes' : 'Create Task'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
