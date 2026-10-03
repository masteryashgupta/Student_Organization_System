import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Kanban,
  Plus,
  Filter,
  Search,
  CheckCircle2,
  Clock,
  ListTodo,
  Sparkles,
  Target,
  DollarSign,
  TrendingUp,
  ShieldCheck,
  RefreshCw,
  FolderPlus,
  Layers,
  ArrowUpDown,
  UserCheck,
  Zap,
  Award,
  AlertCircle,
} from 'lucide-react';
import { useAuth } from '../../lib/AuthContext';
import { useToast } from '../../components/ui/Toast';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Card } from '../../components/ui/Card';
import api from '../../lib/api';
import TaskCard from './TaskCard';
import TaskModal from './TaskModal';
import ProjectModal from './ProjectModal';

export default function TaskBoardPage() {
  const { user, isAuthenticated, isOfficer } = useAuth();
  const toast = useToast();
  const queryClient = useQueryClient();

  // Filters & State
  const [selectedProjectId, setSelectedProjectId] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [onlyMyTasks, setOnlyMyTasks] = useState(false);
  const [priorityFilter, setPriorityFilter] = useState('all');

  // Modals State
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [initialTaskStatus, setInitialTaskStatus] = useState('todo');
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);

  // 1. Fetch Projects (refetch on focus + 10s poll)
  const { data: projects = [], isLoading: isProjectsLoading } = useQuery({
    queryKey: ['projects'],
    queryFn: async () => {
      const res = await api.get('/projects/');
      return res.data?.results || res.data || [];
    },
    refetchInterval: 10000,
    refetchOnWindowFocus: true,
  });

  // 2. Fetch Eligible Assignees / Volunteers
  const { data: assignees = [] } = useQuery({
    queryKey: ['taskAssignees'],
    queryFn: async () => {
      try {
        const res = await api.get('/tasks/assignees/');
        return res.data || [];
      } catch {
        return [];
      }
    },
    staleTime: 1000 * 60,
  });

  // 3. Fetch Tasks (refetch on focus + 5s live poll for multiplayer board sync)
  const { data: tasks = [], isLoading: isTasksLoading, isFetching: isTasksFetching, refetch: refetchTasks } = useQuery({
    queryKey: ['tasks', selectedProjectId, onlyMyTasks],
    queryFn: async () => {
      const params = {};
      if (selectedProjectId !== 'all') params.project = selectedProjectId;
      if (onlyMyTasks && user?.id) params.assignee = user.id;
      const res = await api.get('/tasks/', { params });
      return res.data?.results || res.data || [];
    },
    refetchInterval: 5000,
    refetchOnWindowFocus: true,
  });

  // Active Selected Project Data
  const activeProject = useMemo(() => {
    if (selectedProjectId === 'all') return null;
    return projects.find((p) => String(p.id) === String(selectedProjectId)) || null;
  }, [projects, selectedProjectId]);

  // Filter Tasks by Search Query & Priority
  const filteredTasks = useMemo(() => {
    return tasks.filter((t) => {
      if (priorityFilter !== 'all' && t.priority !== priorityFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = t.title.toLowerCase().includes(q);
        const matchesDesc = (t.description || '').toLowerCase().includes(q);
        const matchesAssignee = (t.assignee_name || '').toLowerCase().includes(q);
        const matchesProject = (t.project_name || '').toLowerCase().includes(q);
        if (!matchesTitle && !matchesDesc && !matchesAssignee && !matchesProject) return false;
      }
      return true;
    });
  }, [tasks, searchQuery, priorityFilter]);

  // Group Tasks into Kanban Columns
  const todoTasks = useMemo(() => filteredTasks.filter((t) => t.status === 'todo'), [filteredTasks]);
  const doingTasks = useMemo(() => filteredTasks.filter((t) => t.status === 'doing'), [filteredTasks]);
  const doneTasks = useMemo(() => filteredTasks.filter((t) => t.status === 'done'), [filteredTasks]);

  // Dual Metric Calculations: Ledger Raised Amount vs Goal + Task Execution Progress
  const metrics = useMemo(() => {
    if (activeProject) {
      const goal = Number(activeProject.goal_amount || 0);
      const raised = Number(activeProject.raised_amount || 0);
      const financialPct = goal > 0 ? Math.min(100, Math.round((raised / goal) * 100)) : 0;
      const totalTasks = activeProject.total_tasks ?? filteredTasks.length;
      const completedTasks = activeProject.completed_tasks ?? doneTasks.length;
      const taskPct = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
      const isFunded = goal > 0 && raised >= goal;
      const isOnTrack = isFunded || financialPct >= 50 || taskPct >= 50 || totalTasks === 0;

      return {
        goal,
        raised,
        financialPct,
        totalTasks,
        completedTasks,
        taskPct,
        isFunded,
        isOnTrack,
        isSpecific: true,
      };
    } else {
      const totalGoal = projects.reduce((sum, p) => sum + Number(p.goal_amount || 0), 0);
      const totalRaised = projects.reduce((sum, p) => sum + Number(p.raised_amount || 0), 0);
      const financialPct = totalGoal > 0 ? Math.min(100, Math.round((totalRaised / totalGoal) * 100)) : 0;
      const totalTasks = filteredTasks.length;
      const completedTasks = doneTasks.length;
      const taskPct = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
      const isFunded = totalGoal > 0 && totalRaised >= totalGoal;
      const isOnTrack = isFunded || financialPct >= 50 || taskPct >= 50 || totalTasks === 0;

      return {
        goal: totalGoal,
        raised: totalRaised,
        financialPct,
        totalTasks,
        completedTasks,
        taskPct,
        isFunded,
        isOnTrack,
        isSpecific: false,
      };
    }
  }, [activeProject, projects, filteredTasks, doneTasks]);

  // --- MUTATIONS ---
  // 1. Task Status Mutation
  const statusMutation = useMutation({
    mutationFn: async ({ taskId, newStatus }) => {
      const res = await api.post(`/tasks/${taskId}/update_status/`, { status: newStatus });
      return res.data;
    },
    onMutate: async ({ taskId, newStatus }) => {
      await queryClient.cancelQueries({ queryKey: ['tasks'] });
      const previousTasks = queryClient.getQueryData(['tasks', selectedProjectId, onlyMyTasks]);

      queryClient.setQueryData(['tasks', selectedProjectId, onlyMyTasks], (old = []) =>
        old.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t))
      );

      return { previousTasks };
    },
    onError: (err, variables, context) => {
      if (context?.previousTasks) {
        queryClient.setQueryData(['tasks', selectedProjectId, onlyMyTasks], context.previousTasks);
      }
      toast.error('Failed to update task status.');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
  });

  // 2. Claim / Assign Mutation
  const claimMutation = useMutation({
    mutationFn: async ({ taskId, userId }) => {
      const payload = userId ? { user_id: userId } : {};
      const res = await api.post(`/tasks/${taskId}/assign/`, payload);
      return res.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      toast.success(data.message || 'Task successfully assigned!');
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Failed to assign task.');
    },
  });

  // 3. Unassign Mutation
  const unassignMutation = useMutation({
    mutationFn: async (taskId) => {
      const res = await api.post(`/tasks/${taskId}/unassign/`);
      return res.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      toast.success('Task unassigned.');
    },
  });

  // 4. Create / Edit Task Mutation
  const saveTaskMutation = useMutation({
    mutationFn: async (payload) => {
      if (editingTask) {
        const res = await api.patch(`/tasks/${editingTask.id}/`, payload);
        return res.data;
      } else {
        const res = await api.post('/tasks/', payload);
        return res.data;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      toast.success(editingTask ? 'Task updated!' : 'New task created!');
      setIsTaskModalOpen(false);
      setEditingTask(null);
    },
    onError: (err) => {
      const details = err.response?.data?.details || err.response?.data;
      const msg = typeof details === 'object' ? Object.values(details).flat().join(' ') : 'Failed to save task.';
      toast.error(msg);
    },
  });

  // 5. Delete Task Mutation
  const deleteTaskMutation = useMutation({
    mutationFn: async (taskId) => {
      await api.delete(`/tasks/${taskId}/`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      toast.success('Task deleted.');
    },
  });

  // 6. Create Project Mutation
  const createProjectMutation = useMutation({
    mutationFn: async (payload) => {
      const res = await api.post('/projects/', payload);
      return res.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      toast.success(`Fundraiser project '${data.name}' created!`);
      setSelectedProjectId(data.id);
      setIsProjectModalOpen(false);
    },
    onError: () => {
      toast.error('Failed to create project.');
    },
  });

  // Action Handlers
  const handleStatusChange = (task, newStatus) => {
    statusMutation.mutate({ taskId: task.id, newStatus });
  };

  const handleClaim = (task) => {
    if (!isAuthenticated) {
      toast.error('Please log in to claim volunteer tasks.');
      return;
    }
    claimMutation.mutate({ taskId: task.id, userId: user?.id });
  };

  const handleUnassign = (task) => {
    unassignMutation.mutate(task.id);
  };

  const handleEdit = (task) => {
    setEditingTask(task);
    setIsTaskModalOpen(true);
  };

  const handleDelete = (task) => {
    if (window.confirm(`Are you sure you want to delete "${task.title}"?`)) {
      deleteTaskMutation.mutate(task.id);
    }
  };

  const handleOpenNewTask = (columnStatus = 'todo') => {
    setEditingTask(null);
    setInitialTaskStatus(columnStatus);
    setIsTaskModalOpen(true);
  };

  return (
    <div className="max-w-7xl mx-auto pb-24 space-y-8 animate-fadeIn">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200/80 pb-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <div className="dual-badge-pill">
              <span className="font-bold flex items-center gap-1.5">
                <Kanban className="w-3.5 h-3.5 text-[#714B67]" /> Action Board
              </span>
              <span className="dual-badge-divider"></span>
              <span className="font-mono text-[11px] text-[#714B67]">
                Live Sync {isTasksFetching && '• Syncing...'}
              </span>
            </div>
          </div>
          <h1 className="text-2xl sm:text-4xl font-extrabold text-[#0F172A] tracking-[-0.03em]">
            Fundraiser Tasks &amp; Volunteer Board
          </h1>
          <p className="text-sm text-[#475569] mt-1">
            Coordinate who&apos;s baking, buying supplies, or running event tables with real-time financial tracking.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            type="button"
            onClick={() => refetchTasks()}
            disabled={isTasksFetching}
            className="w-9 h-9 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-500 hover:text-[#0F172A] hover:border-slate-300 shadow-sm transition-all"
            title="Force Refresh Board"
          >
            <RefreshCw className={`w-4 h-4 ${isTasksFetching ? 'animate-spin text-[#714B67]' : ''}`} />
          </button>

          {isOfficer && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsProjectModalOpen(true)}
              className="font-semibold"
            >
              <FolderPlus className="w-4 h-4 mr-1.5 text-[#714B67]" /> New Project
            </Button>
          )}

          <Button
            variant="primary"
            size="sm"
            onClick={() => handleOpenNewTask('todo')}
            className="font-semibold shadow-sm"
          >
            <Plus className="w-4 h-4 mr-1.5" /> Add Task
          </Button>
        </div>
      </div>

      {/* --- EXECUTIVE "AT A GLANCE" PROGRESS BANNER --- */}
      <div className="p-6 sm:p-8 relative overflow-hidden rounded-3xl bg-white border border-slate-200 shadow-sm">
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-72 h-72 bg-[#714B67]/5 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8 relative z-10">
          {/* Left: Project Selector & Mission Description */}
          <div className="space-y-3 max-w-xl">
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Fundraiser Scope:
              </span>
              <select
                value={selectedProjectId}
                onChange={(e) => setSelectedProjectId(e.target.value)}
                className="bg-white border border-slate-200 text-[#0F172A] font-semibold text-xs rounded-xl px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#714B67]/20 focus:border-[#714B67] transition-colors shadow-xs"
              >
                <option value="all">🌟 All Projects &amp; Fundraisers</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} {Number(p.goal_amount) > 0 ? `(Target: $${Number(p.goal_amount).toFixed(0)})` : ''}
                  </option>
                ))}
              </select>

              {/* Status Badge */}
              {metrics.isFunded ? (
                <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700 border border-emerald-300">
                  <Award className="w-3.5 h-3.5" /> Goal Reached ($)
                </span>
              ) : metrics.isOnTrack ? (
                <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full bg-[#FAF5F9] text-[#714B67] border border-[#D4BFD2]">
                  <TrendingUp className="w-3.5 h-3.5" /> On Track
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full bg-amber-100 text-amber-700 border border-amber-300">
                  <AlertCircle className="w-3.5 h-3.5" /> Needs Attention
                </span>
              )}
            </div>

            <h2 className="text-2xl sm:text-3xl font-extrabold text-[#0F172A] tracking-tight">
              {activeProject ? activeProject.name : 'All Skyline Club Action Items'}
            </h2>
            <p className="text-xs sm:text-sm text-[#64748B] leading-relaxed">
              {activeProject?.description ||
                'Coordinating bake sales, charity drives, volunteer shifts, and supplies checklists across all active fundraisers.'}
            </p>

            {/* Treasury Ledger Verification Stamp */}
            <div className="flex items-center gap-1.5 text-[11px] text-[#714B67] pt-1">
              <Zap className="w-3.5 h-3.5 text-[#714B67]" />
              <span>
                Raised total queried live from central financial ledger (
                <code className="text-[#714B67] font-mono">core.Transaction</code>
                ).
              </span>
            </div>
          </div>

          {/* Right: Dual Progress Gauges (Financial Goal + Task Execution) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-4 min-w-[280px] sm:min-w-[340px] flex-shrink-0">
            {/* 1. FINANCIAL PROGRESS (Raised vs Goal) */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-2.5 shadow-xs">
              <div className="flex items-center justify-between text-xs">
                <span className="text-[#0F172A] font-bold flex items-center gap-1.5">
                  <DollarSign className="w-4 h-4 text-emerald-500" /> Funds Raised So Far
                </span>
                <span className="font-mono font-black text-emerald-600 text-sm">
                  ${metrics.raised.toFixed(2)}
                  <span className="text-[#64748B] text-xs font-normal">
                    {' '}/ ${metrics.goal.toFixed(2)}
                  </span>
                </span>
              </div>

              {/* Financial Progress Bar */}
              <div className="w-full h-2.5 bg-slate-200/70 rounded-full overflow-hidden p-0.5 border border-slate-200">
                <div
                  className={`h-full rounded-full transition-all duration-700 shadow-sm ${
                    metrics.isFunded
                      ? 'bg-gradient-to-r from-emerald-500 to-teal-300'
                      : 'bg-gradient-to-r from-emerald-500 to-emerald-400'
                  }`}
                  style={{ width: `${Math.max(0, Math.min(100, metrics.financialPct))}%` }}
                />
              </div>

              <div className="flex justify-between items-center text-[11px] text-[#64748B]">
                <span>{metrics.financialPct}% of fundraising target</span>
                <span className="text-emerald-600 font-semibold">
                  {metrics.goal > metrics.raised
                    ? `$${(metrics.goal - metrics.raised).toFixed(2)} remaining`
                    : 'Target Met! 🎉'}
                </span>
              </div>
            </div>

            {/* 2. TASK EXECUTION PROGRESS (Done vs Total) */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-2.5 shadow-xs">
              <div className="flex items-center justify-between text-xs">
                <span className="text-[#0F172A] font-bold flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-[#714B67]" /> Action Items Done
                </span>
                <span className="font-mono font-black text-[#714B67] text-sm">
                  {metrics.completedTasks} / {metrics.totalTasks}
                  <span className="text-[#64748B] text-xs font-normal"> tasks</span>
                </span>
              </div>

              {/* Task Progress Bar */}
              <div className="w-full h-2.5 bg-slate-200/70 rounded-full overflow-hidden p-0.5 border border-slate-200">
                <div
                  className="h-full bg-gradient-to-r from-[#714B67] to-[#5B3B52] rounded-full transition-all duration-700 shadow-sm"
                  style={{ width: `${Math.max(0, Math.min(100, metrics.taskPct))}%` }}
                />
              </div>

              {/* Mini Column Counters */}
              <div className="grid grid-cols-3 gap-2 pt-0.5 text-center">
                <div className="bg-white p-1.5 rounded-xl border border-slate-200">
                  <span className="text-[10px] text-[#64748B] block font-medium">To Do</span>
                  <span className="text-xs font-bold text-[#0F172A] font-mono">{todoTasks.length}</span>
                </div>
                <div className="bg-white p-1.5 rounded-xl border border-slate-200">
                  <span className="text-[10px] text-amber-600 block font-medium">Doing</span>
                  <span className="text-xs font-bold text-amber-700 font-mono">{doingTasks.length}</span>
                </div>
                <div className="bg-white p-1.5 rounded-xl border border-slate-200">
                  <span className="text-[10px] text-emerald-600 block font-medium">Done</span>
                  <span className="text-xs font-bold text-emerald-700 font-mono">{doneTasks.length}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white border border-slate-200/80 p-4 rounded-2xl shadow-once-card flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Left: Search Input */}
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search tasks, volunteers, or keywords..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-[#0F172A] placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#714B67]/20 focus:border-[#714B67] focus:bg-white transition-all"
          />
        </div>

        {/* Right: Quick Filters */}
        <div className="flex items-center gap-3 flex-wrap">
          {/* Priority Filter */}
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="bg-slate-50 border border-slate-200 text-[#0F172A] text-xs font-medium rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#714B67]/20 focus:border-[#714B67]"
          >
            <option value="all">All Priorities</option>
            <option value="urgent">🚨 Urgent</option>
            <option value="high">⚠️ High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>

          {/* Only My Tasks Toggle (for logged-in users) */}
          {isAuthenticated && (
            <button
              onClick={() => setOnlyMyTasks(!onlyMyTasks)}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 ${
                onlyMyTasks
                  ? 'bg-[#0F172A] text-white shadow-sm'
                  : 'bg-slate-50 text-slate-600 hover:text-[#0F172A] border border-slate-200'
              }`}
            >
              <UserCheck className="w-3.5 h-3.5" />
              My Tasks Only
            </button>
          )}
        </div>
      </div>

      {/* --- KANBAN BOARD COLUMNS --- */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* 1. TO DO COLUMN */}
        <div className="bg-slate-50/80 border border-slate-200/80 rounded-3xl p-4 sm:p-5 flex flex-col min-h-[520px] shadow-sm">
          {/* Column Header */}
          <div className="flex items-center justify-between pb-3.5 mb-3 border-b border-slate-200">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-slate-400" />
              <h3 className="text-xs font-bold text-[#0F172A] uppercase tracking-wider">To Do</h3>
              <span className="text-[11px] font-bold bg-white text-slate-600 border border-slate-200 px-2 py-0.5 rounded-full font-mono">
                {todoTasks.length}
              </span>
            </div>
            <button
              onClick={() => handleOpenNewTask('todo')}
              className="p-1 text-slate-500 hover:text-[#0F172A] hover:bg-white rounded-lg transition-colors border border-transparent hover:border-slate-200"
              title="Add task to To Do"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          {/* Cards List */}
          <div className="space-y-3 flex-1 overflow-y-auto pr-1">
            {isTasksLoading ? (
              <div className="p-8 text-center animate-pulse text-xs text-slate-400">Loading tasks...</div>
            ) : todoTasks.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-400 border border-dashed border-slate-200 rounded-2xl bg-white/40">
                No tasks to do.
              </div>
            ) : (
              todoTasks.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  currentUser={user}
                  isOfficer={isOfficer}
                  onStatusChange={handleStatusChange}
                  onClaim={handleClaim}
                  onUnassign={handleUnassign}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                />
              ))
            )}
          </div>
        </div>

        {/* 2. DOING / IN PROGRESS COLUMN */}
        <div className="bg-slate-50/80 border border-slate-200/80 rounded-3xl p-4 sm:p-5 flex flex-col min-h-[520px] shadow-sm">
          {/* Column Header */}
          <div className="flex items-center justify-between pb-3.5 mb-3 border-b border-amber-200">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse" />
              <h3 className="text-xs font-bold text-[#0F172A] uppercase tracking-wider">In Progress</h3>
              <span className="text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200 px-2 py-0.5 rounded-full font-mono">
                {doingTasks.length}
              </span>
            </div>
            <button
              onClick={() => handleOpenNewTask('doing')}
              className="p-1 text-slate-500 hover:text-[#0F172A] hover:bg-white rounded-lg transition-colors border border-transparent hover:border-slate-200"
              title="Add task to In Progress"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          {/* Cards List */}
          <div className="space-y-3 flex-1 overflow-y-auto pr-1">
            {isTasksLoading ? (
              <div className="p-8 text-center animate-pulse text-xs text-slate-400">Loading tasks...</div>
            ) : doingTasks.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-400 border border-dashed border-slate-200 rounded-2xl bg-white/40">
                No tasks in progress.
              </div>
            ) : (
              doingTasks.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  currentUser={user}
                  isOfficer={isOfficer}
                  onStatusChange={handleStatusChange}
                  onClaim={handleClaim}
                  onUnassign={handleUnassign}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                />
              ))
            )}
          </div>
        </div>

        {/* 3. DONE / COMPLETED COLUMN */}
        <div className="bg-slate-50/80 border border-slate-200/80 rounded-3xl p-4 sm:p-5 flex flex-col min-h-[520px] shadow-sm">
          {/* Column Header */}
          <div className="flex items-center justify-between pb-3.5 mb-3 border-b border-emerald-200">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <h3 className="text-xs font-bold text-[#0F172A] uppercase tracking-wider">Done</h3>
              <span className="text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded-full font-mono">
                {doneTasks.length}
              </span>
            </div>
            <button
              onClick={() => handleOpenNewTask('done')}
              className="p-1 text-slate-500 hover:text-[#0F172A] hover:bg-white rounded-lg transition-colors border border-transparent hover:border-slate-200"
              title="Add task to Done"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          {/* Cards List */}
          <div className="space-y-3 flex-1 overflow-y-auto pr-1">
            {isTasksLoading ? (
              <div className="p-8 text-center animate-pulse text-xs text-slate-400">Loading tasks...</div>
            ) : doneTasks.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-400 border border-dashed border-slate-200 rounded-2xl bg-white/40">
                No tasks completed yet.
              </div>
            ) : (
              doneTasks.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  currentUser={user}
                  isOfficer={isOfficer}
                  onStatusChange={handleStatusChange}
                  onClaim={handleClaim}
                  onUnassign={handleUnassign}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                />
              ))
            )}
          </div>
        </div>
      </div>

      {/* Task Creation & Edit Modal */}
      <TaskModal
        isOpen={isTaskModalOpen}
        onClose={() => {
          setIsTaskModalOpen(false);
          setEditingTask(null);
        }}
        task={editingTask}
        projects={projects}
        assignees={assignees}
        initialProjectId={selectedProjectId !== 'all' ? selectedProjectId : projects[0]?.id}
        initialStatus={initialTaskStatus}
        onSubmit={(payload) => saveTaskMutation.mutate(payload)}
        isPending={saveTaskMutation.isPending}
      />

      {/* Fundraiser Project Modal */}
      <ProjectModal
        isOpen={isProjectModalOpen}
        onClose={() => setIsProjectModalOpen(false)}
        onSubmit={(payload) => createProjectMutation.mutate(payload)}
        isPending={createProjectMutation.isPending}
      />
    </div>
  );
}
