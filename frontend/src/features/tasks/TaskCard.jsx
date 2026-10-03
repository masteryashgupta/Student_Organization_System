import React from 'react';
import {
  Calendar,
  User as UserIcon,
  AlertCircle,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Clock,
  MoreVertical,
  Edit2,
  Trash2,
  UserPlus,
  UserMinus,
  Sparkles,
  Tag,
} from 'lucide-react';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';

export default function TaskCard({
  task,
  currentUser,
  isOfficer,
  onStatusChange,
  onClaim,
  onUnassign,
  onEdit,
  onDelete,
}) {
  const isAssignedToMe = currentUser && task.assignee === currentUser.id;
  const canMove = isOfficer || isAssignedToMe || !task.assignee;

  // Format Due Date
  const formatDueDate = (dateStr) => {
    if (!dateStr) return null;
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  };

  // Priority Color Badge
  const getPriorityBadge = (priority) => {
    switch (priority?.toLowerCase()) {
      case 'urgent':
        return <Badge variant="danger" className="text-[10px] px-2 py-0.5 font-bold uppercase tracking-wider">Urgent</Badge>;
      case 'high':
        return <Badge variant="warning" className="text-[10px] px-2 py-0.5 font-bold uppercase tracking-wider">High</Badge>;
      case 'medium':
        return <Badge variant="primary" className="text-[10px] px-2 py-0.5 font-medium">Medium</Badge>;
      case 'low':
      default:
        return <Badge variant="neutral" className="text-[10px] px-2 py-0.5 text-slate-500">Low</Badge>;
    }
  };

  return (
    <div
      className={`group relative bg-white border rounded-2xl p-4 transition-all duration-200 shadow-once-card hover:shadow-once-card-hover hover:-translate-y-0.5 ${
        task.is_overdue
          ? 'border-rose-300'
          : task.status === 'done'
          ? 'border-emerald-200 bg-emerald-50/20'
          : 'border-slate-200/90 hover:border-[#D4BFD2]'
      }`}
    >
      {/* Top Meta: Project & Priority */}
      <div className="flex items-center justify-between gap-2 mb-2">
        <span className="text-[11px] font-semibold text-[#714B67] bg-[#FAF5F9] px-2 py-0.5 rounded-full border border-[#D4BFD2] truncate max-w-[170px] flex items-center gap-1">
          <Tag className="w-3 h-3 text-[#714B67] flex-shrink-0" />
          {task.project_name || 'Fundraiser Project'}
        </span>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {getPriorityBadge(task.priority)}
        </div>
      </div>

      {/* Title */}
      <h4 className="text-sm font-bold text-[#0F172A] group-hover:text-[#714B67] transition-colors line-clamp-2 leading-snug">
        {task.title}
      </h4>

      {/* Description Preview (if any) */}
      {task.description && (
        <p className="text-xs text-[#64748B] mt-1.5 line-clamp-2 leading-relaxed">
          {task.description}
        </p>
      )}

      {/* Middle Meta: Assignee & Due Date */}
      <div className="mt-3.5 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
        {/* Assignee Indicator */}
        <div className="flex items-center gap-1.5 min-w-0">
          <div
            className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 ${
              task.assignee
                ? isAssignedToMe
                  ? 'bg-[#714B67] text-white shadow-sm'
                  : 'bg-slate-100 text-slate-700'
                : 'bg-amber-100 text-amber-800 border border-amber-200'
            }`}
          >
            {task.assignee ? (
              (task.assignee_name || 'U').charAt(0).toUpperCase()
            ) : (
              <UserIcon className="w-3 h-3 text-amber-600" />
            )}
          </div>
          <span
            className={`truncate max-w-[110px] text-[11px] font-medium ${
              task.assignee
                ? isAssignedToMe
                  ? 'text-[#714B67] font-bold'
                  : 'text-slate-700'
                : 'text-amber-700 italic font-semibold'
            }`}
          >
            {task.assignee ? (isAssignedToMe ? 'Assigned to You' : task.assignee_name) : 'Open Slot'}
          </span>
        </div>

        {/* Due Date & Overdue Tag */}
        {task.due_date && (
          <div
            className={`flex items-center gap-1 text-[11px] font-medium ${
              task.is_overdue
                ? 'text-rose-600 font-bold animate-pulse'
                : 'text-slate-500'
            }`}
            title={task.is_overdue ? 'Task is Overdue!' : `Due: ${task.due_date}`}
          >
            <Calendar className="w-3 h-3 text-slate-400" />
            <span>{formatDueDate(task.due_date)}</span>
            {task.is_overdue && (
              <AlertCircle className="w-3 h-3 text-rose-500 flex-shrink-0" />
            )}
          </div>
        )}
      </div>

      {/* Action Bar / Status Stepper */}
      <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between gap-1">
        {/* Left Move / Backward button */}
        {task.status !== 'todo' && canMove ? (
          <button
            onClick={() => onStatusChange(task, task.status === 'done' ? 'doing' : 'todo')}
            className="p-1 px-2 text-slate-600 hover:text-[#0F172A] hover:bg-slate-100 rounded-lg transition-colors text-[11px] flex items-center gap-1 font-semibold"
            title={`Move back to ${task.status === 'done' ? 'Doing' : 'To Do'}`}
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Back</span>
          </button>
        ) : (
          <div />
        )}

        {/* Center Quick Actions (Claim / Edit / Delete) */}
        <div className="flex items-center gap-1">
          {/* Volunteer Claim / Self-Assign */}
          {!task.assignee && currentUser && (
            <button
              onClick={() => onClaim(task)}
              className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-full text-[11px] font-bold flex items-center gap-1 transition-colors"
              title="Claim this volunteer role"
            >
              <UserPlus className="w-3 h-3 text-amber-600" />
              Claim
            </button>
          )}

          {/* Unassign (for officers or currently assigned user) */}
          {task.assignee && (isOfficer || isAssignedToMe) && (
            <button
              onClick={() => onUnassign(task)}
              className="p-1 text-slate-400 hover:text-amber-600 hover:bg-slate-100 rounded-lg transition-colors"
              title="Release / Unassign"
            >
              <UserMinus className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Edit (officers or assignee) */}
          {(isOfficer || isAssignedToMe) && (
            <button
              onClick={() => onEdit(task)}
              className="p-1 text-slate-400 hover:text-sky-600 hover:bg-slate-100 rounded-lg transition-colors"
              title="Edit Task"
            >
              <Edit2 className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Delete (officers only) */}
          {isOfficer && (
            <button
              onClick={() => onDelete(task)}
              className="p-1 text-slate-400 hover:text-rose-600 hover:bg-slate-100 rounded-lg transition-colors"
              title="Delete Task"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Right Move / Forward button */}
        {task.status !== 'done' && canMove ? (
          <button
            onClick={() => onStatusChange(task, task.status === 'todo' ? 'doing' : 'done')}
            className={`px-3 py-1 rounded-full transition-all text-[11px] font-bold flex items-center gap-1 ${
              task.status === 'doing'
                ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm'
                : 'bg-[#0F172A] hover:bg-slate-800 text-white shadow-sm'
            }`}
            title={`Advance to ${task.status === 'todo' ? 'Doing' : 'Done'}`}
          >
            <span>{task.status === 'todo' ? 'Start' : 'Complete'}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        ) : task.status === 'done' ? (
          <span className="text-[11px] font-bold text-emerald-600 flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" /> Done
          </span>
        ) : (
          <div />
        )}
      </div>
    </div>
  );
}
