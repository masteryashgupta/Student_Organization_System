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
  Users,
  RefreshCw,
  FolderPlus,
  Layers,
  ArrowUpDown,
  UserCheck,
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

  // Overall Completion Rate
  const overallProgress = useMemo(() => {
    const total = filteredTasks.length;
    if (total === 0) return 0;
    return Math.round((doneTasks.length / total) * 100);
  }, [filteredTasks.length, doneTasks.length]);

  // --- MUTATIONS WITH OPTIMISTIC UPDATES ---

  // 1. Status Transition Mutation (Optimistic)
  const statusMutation = useMutation({
    mutationFn: async ({ taskId, newStatus }) => {
      const res = await api.post(`/tasks/${taskId}/update_status/`, { status: newStatus });
      return res.data;
    },
    onMutate: async ({ taskId, newStatus }) => {
      await queryClient.cancelQueries({ queryKey: ['tasks'] });
      const previousTasks = queryClient.getQueryData(['tasks', selectedProjectId, onlyMyTasks]);

      // Optimistically update the task status in cache immediately
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
      toast.success(data.message || 'Task unassigned.');
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
    onError: (err) => {
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
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800/80 pb-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Badge variant="brand" className="flex items-center gap-1.5 px-3 py-1 font-semibold">
              <Kanban className="w-3.5 h-3.5 text-brand-400" /> Volunteer Action Board
            </Badge>
            <span className="text-xs text-slate-500 font-mono">
              Live Sync {isTasksFetching && '• Syncing...'}
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            Fundraiser Tasks & Volunteer Board
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Coordinate who&apos;s baking, buying supplies, or running event tables with real-time Kanban sync.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => refetchTasks()}
            disabled={isTasksFetching}
            className="text-slate-400 hover:text-white"
            title="Force Refresh Board"
          >
            <RefreshCw className={`w-4 h-4 ${isTasksFetching ? 'animate-spin text-brand-400' : ''}`} />
          </Button>

          {isOfficer && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsProjectModalOpen(true)}
              className="font-semibold"
            >
              <FolderPlus className="w-4 h-4 mr-1.5 text-brand-400" /> New Project
            </Button>
          )}

          <Button
            variant="primary"
            size="sm"
            onClick={() => handleOpenNewTask('todo')}
            className="font-semibold shadow-lg shadow-brand-500/20"
          >
            <Plus className="w-4 h-4 mr-1.5" /> Add Task
          </Button>
        </div>
      </div>

      {/* Project "At A Glance" Executive Banner */}
      <div className="bg-gradient-to-r from-surface-900 via-surface-900 to-surface-950 border border-slate-800 rounded-3xl p-6 relative overflow-hidden shadow-xl">
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-brand-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          {/* Project Info & Selector */}
          <div className="space-y-3 max-w-xl">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Active Fundraiser:
              </span>
              <select
                value={selectedProjectId}
                onChange={(e) => setSelectedProjectId(e.target.value)}
                className="bg-surface-800 border border-slate-700 text-white font-bold text-xs rounded-xl px-3 py-1.5 focus:outline-none focus:border-brand-500 transition-colors"
              >
                <option value="all">🌟 All Projects & Fundraisers</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} {Number(p.goal_amount) > 0 ? `(Target: $${Number(p.goal_amount).toFixed(0)})` : ''}
                  </option>
                ))}
              </select>
            </div>

            <h2 className="text-xl sm:text-2xl font-black text-white">
              {activeProject ? activeProject.name : 'All Skyline Club Action Items'}
            </h2>
            <p className="text-xs text-slate-300 leading-relaxed">
              {activeProject?.description ||
                'Track team progress across active fundraisers, volunteer shifts, and supplies checklists.'}
            </p>
          </div>

          {/* Metrics & Completion Bar */}
          <div className="bg-surface-950/70 border border-slate-800/80 rounded-2xl p-4 sm:p-5 flex-shrink-0 min-w-[280px] sm:min-w-[320px] space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400 font-semibold">Completion Rate</span>
              <span className="font-mono font-black text-brand-300 text-sm">
                {overallProgress}% ({doneTasks.length}/{filteredTasks.length} done)
              </span>
            </div>

            {/* Progress Bar */}
            <div className="w-full h-3 bg-surface-800 rounded-full overflow-hidden p-0.5 border border-slate-700/60">
              <div
                className="h-full bg-gradient-to-r from-brand-500 to-emerald-400 rounded-full transition-all duration-500 shadow-sm shadow-emerald-500/50"
                style={{ width: `${Math.max(0, Math.min(100, overallProgress))}%` }}
              />
            </div>

            {/* Sub-KPIs */}
            <div className="grid grid-cols-3 gap-2 pt-1 text-center">
              <div className="bg-surface-900/80 p-1.5 rounded-lg border border-slate-800">
                <span className="text-[10px] text-slate-400 block">To Do</span>
                <span className="text-xs font-bold text-slate-300 font-mono">{todoTasks.length}</span>
              </div>
              <div className="bg-surface-900/80 p-1.5 rounded-lg border border-slate-800">
                <span className="text-[10px] text-amber-400 block">Doing</span>
                <span className="text-xs font-bold text-amber-300 font-mono">{doingTasks.length}</span>
              </div>
              <div className="bg-surface-900/80 p-1.5 rounded-lg border border-slate-800">
                <span className="text-[10px] text-emerald-400 block">Done</span>
                <span className="text-xs font-bold text-emerald-300 font-mono">{doneTasks.length}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-surface-900 border border-slate-800 p-4 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Left: Search Input */}
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            placeholder="Search tasks, volunteers, or keywords..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-1.5 text-xs bg-surface-950 border border-slate-700/80 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-brand-500 transition-colors"
          />
        </div>

        {/* Right: Quick Filters */}
        <div className="flex items-center gap-3 flex-wrap">
          {/* Priority Filter */}
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="bg-surface-950 border border-slate-700 text-slate-300 text-xs rounded-xl px-3 py-1.5 focus:outline-none focus:border-brand-500"
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
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                onlyMyTasks
                  ? 'bg-brand-600 text-white shadow-md shadow-brand-600/30'
                  : 'bg-surface-800/80 text-slate-400 hover:text-white hover:bg-surface-700'
              }`}
            >
              <UserCheck className="w-3.5 h-3.5" />
              My Tasks Only
            </button>
          )}
        </div>
      </div>

      {/* --- KANBAN BOARD COLUMNS (TODO / DOING / DONE) --- */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* 1. TO DO COLUMN */}
        <div className="bg-surface-950/60 border border-slate-800/90 rounded-3xl p-4 sm:p-5 flex flex-col min-h-[520px]">
          {/* Column Header */}
          <div className="flex items-center justify-between pb-3.5 mb-3 border-b border-slate-800/80">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-slate-400" />
              <h3 className="text-sm font-black text-white uppercase tracking-wider">To Do</h3>
              <span className="text-xs font-bold bg-surface-800 text-slate-300 px-2 py-0.5 rounded-full font-mono">
                {todoTasks.length}
              </span>
            </div>
            <button
              onClick={() => handleOpenNewTask('todo')}
              className="p-1 text-slate-400 hover:text-white hover:bg-surface-800 rounded-lg transition-colors"
              title="Add task to To Do"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          {/* Cards List */}
          <div className="space-y-3 flex-1 overflow-y-auto pr-1">
            {isTasksLoading ? (
              <div className="p-8 text-center animate-pulse text-xs text-slate-500">Loading tasks...</div>
            ) : todoTasks.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-500 border border-dashed border-slate-800 rounded-2xl">
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
        <div className="bg-surface-950/60 border border-slate-800/90 rounded-3xl p-4 sm:p-5 flex flex-col min-h-[520px]">
          {/* Column Header */}
          <div className="flex items-center justify-between pb-3.5 mb-3 border-b border-amber-500/30">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse" />
              <h3 className="text-sm font-black text-white uppercase tracking-wider">In Progress</h3>
              <span className="text-xs font-bold bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-full font-mono">
                {doingTasks.length}
              </span>
            </div>
            <button
              onClick={() => handleOpenNewTask('doing')}
              className="p-1 text-slate-400 hover:text-white hover:bg-surface-800 rounded-lg transition-colors"
              title="Add task to In Progress"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          {/* Cards List */}
          <div className="space-y-3 flex-1 overflow-y-auto pr-1">
            {isTasksLoading ? (
              <div className="p-8 text-center animate-pulse text-xs text-slate-500">Loading tasks...</div>
            ) : doingTasks.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-500 border border-dashed border-slate-800 rounded-2xl">
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
        <div className="bg-surface-950/60 border border-slate-800/90 rounded-3xl p-4 sm:p-5 flex flex-col min-h-[520px]">
          {/* Column Header */}
          <div className="flex items-center justify-between pb-3.5 mb-3 border-b border-emerald-500/30">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <h3 className="text-sm font-black text-white uppercase tracking-wider">Done</h3>
              <span className="text-xs font-bold bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full font-mono">
                {doneTasks.length}
              </span>
            </div>
            <button
              onClick={() => handleOpenNewTask('done')}
              className="p-1 text-slate-400 hover:text-white hover:bg-surface-800 rounded-lg transition-colors"
              title="Add task to Done"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          {/* Cards List */}
          <div className="space-y-3 flex-1 overflow-y-auto pr-1">
            {isTasksLoading ? (
              <div className="p-8 text-center animate-pulse text-xs text-slate-500">Loading tasks...</div>
            ) : doneTasks.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-500 border border-dashed border-slate-800 rounded-2xl">
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
