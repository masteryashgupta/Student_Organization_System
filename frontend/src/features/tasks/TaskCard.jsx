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
        return <Badge variant="danger" className="text-[10px] px-2.5 py-0.5 font-bold uppercase tracking-wider rounded-full">Urgent</Badge>;
      case 'high':
        return <Badge variant="warning" className="text-[10px] px-2.5 py-0.5 font-bold uppercase tracking-wider rounded-full">High</Badge>;
      case 'medium':
        return <Badge variant="primary" className="text-[10px] px-2.5 py-0.5 font-bold rounded-full">Medium</Badge>;
      case 'low':
      default:
        return <Badge variant="neutral" className="text-[10px] px-2.5 py-0.5 rounded-full text-slate-400">Low</Badge>;
    }
  };

  return (
    <div
      className={`group relative glass-card bg-white/80 dark:bg-slate-900/80 border rounded-2xl p-4 transition-all duration-300 shadow-md hover:shadow-xl hover:-translate-y-0.5 backdrop-blur-xl ${
        task.is_overdue
          ? 'border-rose-400/80 dark:border-rose-800/80 shadow-rose-500/5'
          : task.status === 'done'
          ? 'border-emerald-300/60 dark:border-emerald-700/50 bg-emerald-500/5'
          : 'border-slate-200/80 dark:border-slate-800/80 hover:border-purple-300 dark:hover:border-purple-700'
      }`}
    >
      {/* Top Meta: Project & Priority */}
      <div className="flex items-center justify-between gap-2 mb-2">
        <span className="text-[11px] font-bold text-[#714B67] dark:text-purple-300 bg-purple-500/10 dark:bg-purple-500/20 px-2.5 py-0.5 rounded-full border border-purple-500/20 truncate max-w-[170px] flex items-center gap-1 shadow-xs">
          <Tag className="w-3 h-3 text-[#714B67] dark:text-purple-400 flex-shrink-0" />
          {task.project_name || 'Fundraiser Project'}
        </span>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {getPriorityBadge(task.priority)}
        </div>
      </div>

      {/* Title */}
      <h4 className="text-sm font-extrabold text-slate-900 dark:text-white group-hover:text-[#714B67] dark:group-hover:text-purple-300 transition-colors line-clamp-2 leading-snug">
        {task.title}
      </h4>

      {/* Description Preview (if any) */}
      {task.description && (
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 line-clamp-2 leading-relaxed">
          {task.description}
        </p>
      )}

      {/* Middle Meta: Assignee & Due Date */}
      <div className="mt-3.5 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
        {/* Assignee Indicator */}
        <div className="flex items-center gap-1.5 min-w-0">
          <div
            className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 shadow-sm ${
              task.assignee
                ? isAssignedToMe
                  ? 'bg-gradient-to-tr from-[#714B67] to-[#8C5D80] text-white'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                : 'bg-amber-100 dark:bg-amber-900/50 text-amber-800 dark:text-amber-200 border border-amber-300 dark:border-amber-700'
            }`}
          >
            {task.assignee ? (
              (task.assignee_name || 'U').charAt(0).toUpperCase()
            ) : (
              <UserIcon className="w-3 h-3 text-amber-600 dark:text-amber-400" />
            )}
          </div>
          <span
            className={`truncate max-w-[110px] text-[11px] font-medium ${
              task.assignee
                ? isAssignedToMe
                  ? 'text-[#714B67] dark:text-purple-300 font-bold'
                  : 'text-slate-700 dark:text-slate-300'
                : 'text-amber-700 dark:text-amber-300 italic font-semibold'
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
                ? 'text-rose-600 dark:text-rose-400 font-bold animate-pulse'
                : 'text-slate-500 dark:text-slate-400'
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
      <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-1">
        {/* Left Move / Backward button */}
        {task.status !== 'todo' && canMove ? (
          <button
            onClick={() => onStatusChange(task, task.status === 'done' ? 'doing' : 'todo')}
            className="p-1 px-2.5 text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors text-[11px] flex items-center gap-1 font-bold"
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
              className="px-3 py-1 bg-amber-500/15 hover:bg-amber-500/25 text-amber-800 dark:text-amber-200 border border-amber-300 dark:border-amber-700 rounded-full text-[11px] font-bold flex items-center gap-1 transition-colors shadow-xs"
              title="Claim this volunteer role"
            >
              <UserPlus className="w-3 h-3 text-amber-600 dark:text-amber-400" />
              Claim
            </button>
          )}

          {/* Unassign (for officers or currently assigned user) */}
          {task.assignee && (isOfficer || isAssignedToMe) && (
            <button
              onClick={() => onUnassign(task)}
              className="p-1.5 text-slate-400 hover:text-amber-600 dark:hover:text-amber-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"
              title="Release / Unassign"
            >
              <UserMinus className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Edit (officers or assignee) */}
          {(isOfficer || isAssignedToMe) && (
            <button
              onClick={() => onEdit(task)}
              className="p-1.5 text-slate-400 hover:text-sky-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"
              title="Edit Task"
            >
              <Edit2 className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Delete (officers only) */}
          {isOfficer && (
            <button
              onClick={() => onDelete(task)}
              className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"
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
            className={`px-3.5 py-1 rounded-full transition-all text-[11px] font-bold flex items-center gap-1 shadow-sm active:scale-95 ${
              task.status === 'doing'
                ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white'
                : 'bg-gradient-to-r from-[#714B67] to-[#8C5D80] text-white'
            }`}
            title={`Advance to ${task.status === 'todo' ? 'Doing' : 'Done'}`}
          >
            <span>{task.status === 'todo' ? 'Start' : 'Complete'}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        ) : task.status === 'done' ? (
          <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" /> Done
          </span>
        ) : (
          <div />
        )}
      </div>
    </div>
  );
}
