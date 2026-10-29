import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Plus,
  Search,
  Users,
  AlertCircle,
  X,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { projectService } from '../../services/projectService';
import { taskService } from '../../services/taskService';
import type {
  Project,
  ProjectMember,
  ProjectMemberRole,
  Task,
  TaskPriority,
  TaskStatus,
} from '../../types/database';
import { KanbanColumn } from '../../components/kanban/KanbanColumn';
import { Button } from '../../components/common/Button';
import { TaskModal } from '../../components/tasks/TaskModal';
import { ProjectMembersModal } from '../../components/projects/ProjectMembersModal';

export const KanbanBoardPage: React.FC = () => {
  const { id, projectId: paramProjectId } = useParams<{ id?: string; projectId?: string }>();
  const projectId = paramProjectId || id;
  const navigate = useNavigate();
  const { user } = useAuth();
  const userRole = user?.activeRole;

  const [project, setProject] = useState<Project | null>(null);
  const [members, setMembers] = useState<ProjectMember[]>([]);
  const [userProjectRole, setUserProjectRole] = useState<ProjectMemberRole | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Filters state (composable)
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPriority, setSelectedPriority] = useState<TaskPriority | 'ALL'>('ALL');
  const [selectedAssignee, setSelectedAssignee] = useState<string>('ALL');

  // Modals state
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [newTaskInitialStatus, setNewTaskInitialStatus] = useState<TaskStatus>('TODO');
  const [isMembersModalOpen, setIsMembersModalOpen] = useState(false);

  // Authorization checks
  const isPrivileged = userRole === 'ADMIN' || userRole === 'ORGANIZER';
  const isLead =
    isPrivileged ||
    userProjectRole === 'LEAD' ||
    project?.lead_id === user?.id ||
    project?.created_by === user?.id;
  // VIEWER users cannot modify project tasks
  const canModifyTasks = isLead || userProjectRole === 'CONTRIBUTOR';

  const loadData = useCallback(async () => {
    if (!projectId) return;
    try {
      setIsLoading(true);
      setErrorMessage(null);

      const [projData, projTasks] = await Promise.all([
        projectService.getProjectById(projectId, user?.id, userRole || undefined),
        taskService.getProjectTasks(projectId),
      ]);

      setProject(projData.project);
      setMembers(projData.members);
      setUserProjectRole(projData.userProjectRole);
      setTasks(projTasks);
    } catch (err: unknown) {
      console.error('Failed to load Kanban board data:', err);
      setErrorMessage((err as Error).message || 'Unable to access Kanban board.');
    } finally {
      setIsLoading(false);
    }
  }, [projectId, user?.id, userRole]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Optimistic Drag-and-Drop / Status Change with Rollback on Failure
  const handleStatusChange = async (task: Task, newStatus: TaskStatus) => {
    if (!canModifyTasks || !user) return;
    if (task.status === newStatus) return;

    // Snapshot previous tasks for rollback
    const previousTasks = [...tasks];

    // Optimistically update local state immediately
    setTasks((current) =>
      current.map((t) => (t.id === task.id ? { ...t, status: newStatus } : t))
    );

    try {
      await taskService.updateTaskStatus(
        task.id,
        newStatus,
        undefined,
        user.id,
        userRole || undefined
      );
    } catch (err: unknown) {
      console.error('Failed to persist task status change:', err);
      // Rollback on failure
      setTasks(previousTasks);
      alert(`Could not update task status: ${(err as Error).message}`);
    }
  };

  const handleDropTask = (taskId: string, targetStatus: TaskStatus) => {
    const task = tasks.find((t) => t.id === taskId);
    if (task) {
      handleStatusChange(task, targetStatus);
    }
  };

  // Quick Task Creation from within a column
  const handleQuickCreateTask = async (columnStatus: TaskStatus, title: string) => {
    if (!projectId || !user || !canModifyTasks) return;
    try {
      const created = await taskService.createTask(
        {
          project_id: projectId,
          title,
          status: columnStatus,
          priority: 'MEDIUM',
        },
        user.id,
        userRole || undefined
      );
      setTasks((prev) => [...prev, created]);
    } catch (err: unknown) {
      alert(`Failed to create task: ${(err as Error).message}`);
      throw err;
    }
  };

  const handleDeleteTask = async (task: Task) => {
    if (!user || !canModifyTasks) return;
    if (!window.confirm(`Delete task "${task.title}"?`)) return;

    const previousTasks = [...tasks];
    setTasks((current) => current.filter((t) => t.id !== task.id));

    try {
      await taskService.deleteTask(task.id, user.id, userRole || undefined);
    } catch (err: unknown) {
      setTasks(previousTasks);
      alert(`Failed to delete task: ${(err as Error).message}`);
    }
  };

  // Composable Filter Logic
  const filteredTasks = useMemo(() => {
    return tasks.filter((t) => {
      // 1. Search filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const matchesTitle = t.title.toLowerCase().includes(query);
        const matchesNum = t.task_number.toLowerCase().includes(query);
        const matchesDesc = t.description?.toLowerCase().includes(query);
        if (!matchesTitle && !matchesNum && !matchesDesc) return false;
      }

      // 2. Priority filter
      if (selectedPriority !== 'ALL' && t.priority !== selectedPriority) {
        return false;
      }

      // 3. Assignee filter
      if (selectedAssignee !== 'ALL') {
        if (selectedAssignee === 'UNASSIGNED') {
          if (t.assignee_id !== null) return false;
        } else if (t.assignee_id !== selectedAssignee) {
          return false;
        }
      }

      return true;
    });
  }, [tasks, searchQuery, selectedPriority, selectedAssignee]);

  // Tasks grouped by column
  const todoTasks = useMemo(
    () => filteredTasks.filter((t) => t.status === 'TODO'),
    [filteredTasks]
  );
  const inProgressTasks = useMemo(
    () => filteredTasks.filter((t) => t.status === 'IN_PROGRESS'),
    [filteredTasks]
  );
  const doneTasks = useMemo(
    () => filteredTasks.filter((t) => t.status === 'DONE'),
    [filteredTasks]
  );

  const hasActiveFilters =
    Boolean(searchQuery) || selectedPriority !== 'ALL' || selectedAssignee !== 'ALL';

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedPriority('ALL');
    setSelectedAssignee('ALL');
  };

  if (isLoading) {
    return (
      <div className="max-w-[1400px] mx-auto p-6 space-y-4 animate-pulse">
        <div className="h-6 w-48 bg-[#E2E8F0] rounded" />
        <div className="h-12 w-full bg-[#E2E8F0] rounded-xl" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 h-[600px]">
          <div className="bg-[#E2E8F0] rounded-xl" />
          <div className="bg-[#E2E8F0] rounded-xl" />
          <div className="bg-[#E2E8F0] rounded-xl" />
        </div>
      </div>
    );
  }

  if (errorMessage || !project) {
    return (
      <div className="max-w-md mx-auto mt-16 p-8 bg-white border border-[#E2E8F0] rounded-2xl text-center shadow-sm">
        <div className="w-12 h-12 bg-[#FEF2F2] rounded-full flex items-center justify-center mx-auto mb-4 text-[#DC2626]">
          <AlertCircle className="w-6 h-6" />
        </div>
        <h2 className="text-lg font-bold text-[#0F172A] mb-2">Access Denied</h2>
        <p className="text-sm text-[#64748B] mb-6">
          {errorMessage || 'You are not authorized to view this project Kanban board.'}
        </p>
        <Button variant="primary" onClick={() => navigate('/projects')}>
          Return to Projects
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4 max-w-[1400px] mx-auto pb-8">
      {/* Top Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Link
              to={`/projects/${project.id}`}
              className="p-1 rounded-lg text-[#64748B] hover:text-[#0F172A] hover:bg-[#F1F5F9] transition-colors"
              title="Back to Project Overview"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <span className="font-mono text-xs font-bold text-[#171717] bg-[#F5F5F5] px-2 py-0.5 rounded border border-[#E5E5E5]">
              {project.code}
            </span>
            <h1 className="text-xl font-bold tracking-tight text-[#0F172A]">
              {project.title} — Kanban Board
            </h1>
          </div>
          <p className="text-xs text-[#64748B] mt-0.5 ml-7">
            Drag cards between columns or use the action menu on each card to change status.
          </p>
        </div>

        {/* Board Action Buttons */}
        <div className="flex items-center gap-2 ml-7 md:ml-0">
          {isLead && (
            <Button
              variant="secondary"
              size="sm"
              leftIcon={<Users className="w-3.5 h-3.5" />}
              onClick={() => setIsMembersModalOpen(true)}
            >
              Members ({members.length})
            </Button>
          )}

          {canModifyTasks && (
            <Button
              variant="primary"
              size="sm"
              leftIcon={<Plus className="w-4 h-4" />}
              onClick={() => {
                setEditingTask(null);
                setNewTaskInitialStatus('TODO');
                setIsTaskModalOpen(true);
              }}
            >
              New Task
            </Button>
          )}

          {!canModifyTasks && (
            <span className="text-xs px-2.5 py-1 rounded-md bg-[#F1F5F9] text-[#64748B] font-medium border border-[#E2E8F0]">
              Viewer mode (Read-only)
            </span>
          )}
        </div>
      </div>

      {/* Composable Filters & Search Bar */}
      <div className="bg-white p-3 rounded-xl border border-[#E2E8F0] shadow-xs flex flex-col md:flex-row gap-2.5 items-stretch md:items-center justify-between">
        {/* Search Input */}
        <div className="relative flex-1 max-w-sm">
          <Search className="w-3.5 h-3.5 text-[#94A3B8] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Filter tasks by name, code, or description..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full text-xs pl-8 pr-3 py-1.5 border border-[#CBD5E1] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#090909]/20 focus:border-[#090909]"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-[#94A3B8] hover:text-[#0F172A]"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>

        {/* Filters Controls */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          {/* Priority Filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-[#64748B] font-medium hidden sm:inline">Priority:</span>
            <select
              value={selectedPriority}
              onChange={(e) => setSelectedPriority(e.target.value as TaskPriority | 'ALL')}
              className="border border-[#CBD5E1] bg-white rounded-lg px-2.5 py-1 text-xs text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#090909]/20"
            >
              <option value="ALL">All Priorities</option>
              <option value="HIGH">High Priority</option>
              <option value="MEDIUM">Medium Priority</option>
              <option value="LOW">Low Priority</option>
            </select>
          </div>

          {/* Assignee Filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-[#64748B] font-medium hidden sm:inline">Assignee:</span>
            <select
              value={selectedAssignee}
              onChange={(e) => setSelectedAssignee(e.target.value)}
              className="border border-[#CBD5E1] bg-white rounded-lg px-2.5 py-1 text-xs text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#090909]/20 max-w-[140px] truncate"
            >
              <option value="ALL">All Assignees</option>
              <option value="UNASSIGNED">Unassigned</option>
              {members.map((m) => (
                <option key={m.user_id} value={m.user_id}>
                  {m.profile?.full_name || m.user_id}
                </option>
              ))}
            </select>
          </div>

          {/* Reset Filters */}
          {hasActiveFilters && (
            <button
              type="button"
              onClick={clearFilters}
              className="text-xs text-[#DC2626] hover:text-[#B91C1C] font-semibold px-2 py-1 rounded hover:bg-[#FEF2F2] transition-colors"
            >
              Reset Filters
            </button>
          )}

          <div className="text-xs text-[#94A3B8] border-l border-[#E2E8F0] pl-2 font-medium">
            Showing <strong>{filteredTasks.length}</strong> of {tasks.length} tasks
          </div>
        </div>
      </div>

      {/* Kanban 3-Column Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 items-start overflow-x-auto min-w-full pb-4">
        {/* Column 1: TODO */}
        <KanbanColumn
          status="TODO"
          title="To Do"
          tasks={todoTasks}
          canEdit={canModifyTasks}
          onEditTask={(task) => {
            setEditingTask(task);
            setIsTaskModalOpen(true);
          }}
          onDeleteTask={handleDeleteTask}
          onStatusChange={handleStatusChange}
          onQuickCreateTask={handleQuickCreateTask}
          onDropTask={handleDropTask}
        />

        {/* Column 2: IN_PROGRESS */}
        <KanbanColumn
          status="IN_PROGRESS"
          title="In Progress"
          tasks={inProgressTasks}
          canEdit={canModifyTasks}
          onEditTask={(task) => {
            setEditingTask(task);
            setIsTaskModalOpen(true);
          }}
          onDeleteTask={handleDeleteTask}
          onStatusChange={handleStatusChange}
          onQuickCreateTask={handleQuickCreateTask}
          onDropTask={handleDropTask}
        />

        {/* Column 3: DONE */}
        <KanbanColumn
          status="DONE"
          title="Done"
          tasks={doneTasks}
          canEdit={canModifyTasks}
          onEditTask={(task) => {
            setEditingTask(task);
            setIsTaskModalOpen(true);
          }}
          onDeleteTask={handleDeleteTask}
          onStatusChange={handleStatusChange}
          onQuickCreateTask={handleQuickCreateTask}
          onDropTask={handleDropTask}
        />
      </div>

      {/* Task Create / Edit Modal */}
      {isTaskModalOpen && (
        <TaskModal
          isOpen={true}
          projectId={project.id}
          projectMembers={members}
          task={editingTask}
          defaultStatus={newTaskInitialStatus}
          currentUserId={user?.id || ''}
          userProjectRole={userProjectRole}
          onClose={() => {
            setIsTaskModalOpen(false);
            setEditingTask(null);
          }}
          onTaskSaved={() => {
            setIsTaskModalOpen(false);
            setEditingTask(null);
            loadData();
          }}
        />
      )}

      {/* Project Members Modal */}
      {isMembersModalOpen && (
        <ProjectMembersModal
          isOpen={true}
          project={project}
          members={members}
          onMembersChanged={() => {
            loadData();
          }}
          currentUserId={user?.id || ''}
          userRole={userRole}
          isLeadOrAdmin={isLead}
          onClose={() => setIsMembersModalOpen(false)}
        />
      )}
    </div>
  );
};
