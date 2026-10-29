import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  CheckSquare,
  Search,
  AlertCircle,
  Clock,
  CheckCircle2,
  FolderKanban,
  Edit2,
  X,
  ExternalLink,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { taskService } from '../../services/taskService';
import { projectService } from '../../services/projectService';
import type { TaskWithProject, TaskStatus, TaskPriority, Project } from '../../types/database';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { Card, CardContent } from '../../components/common/Card';
import { TaskModal } from '../../components/tasks/TaskModal';

export const MyTasksPage: React.FC = () => {
  const { user } = useAuth();
  const userRole = user?.activeRole;

  const [tasks, setTasks] = useState<TaskWithProject[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Filters state (composable)
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProjectId, setSelectedProjectId] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<TaskStatus | 'ALL'>('ALL');
  const [selectedPriority, setSelectedPriority] = useState<TaskPriority | 'ALL'>('ALL');

  // Task edit modal
  const [selectedTask, setSelectedTask] = useState<TaskWithProject | null>(null);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);

  const fetchMyTasks = useCallback(async () => {
    if (!user) return;
    try {
      setIsLoading(true);
      setErrorMessage(null);

      const [myTasks, allProjects] = await Promise.all([
        taskService.getMyTasks(user.id),
        projectService.getProjects(user.id, userRole || undefined),
      ]);

      setTasks(myTasks);
      setProjects(allProjects);
    } catch (err: unknown) {
      console.error('Failed to load my tasks:', err);
      setErrorMessage((err as Error).message || 'Unable to retrieve your tasks.');
    } finally {
      setIsLoading(false);
    }
  }, [user, userRole]);

  useEffect(() => {
    fetchMyTasks();
  }, [fetchMyTasks]);

  // Quick status update from the table
  const handleStatusChange = async (task: TaskWithProject, newStatus: TaskStatus) => {
    if (!user || task.status === newStatus) return;

    const previousTasks = [...tasks];
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
      setTasks(previousTasks);
      alert(`Could not update task status: ${(err as Error).message}`);
    }
  };

  // Filter composition
  const filteredTasks = useMemo(() => {
    return tasks.filter((t) => {
      // 1. Search filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const matchesTitle = t.title.toLowerCase().includes(query);
        const matchesNum = t.task_number.toLowerCase().includes(query);
        const matchesDesc = t.description?.toLowerCase().includes(query);
        const matchesProj = t.project?.title.toLowerCase().includes(query) || false;
        if (!matchesTitle && !matchesNum && !matchesDesc && !matchesProj) return false;
      }

      // 2. Project filter
      if (selectedProjectId !== 'ALL' && t.project_id !== selectedProjectId) {
        return false;
      }

      // 3. Status filter
      if (selectedStatus !== 'ALL' && t.status !== selectedStatus) {
        return false;
      }

      // 4. Priority filter
      if (selectedPriority !== 'ALL' && t.priority !== selectedPriority) {
        return false;
      }

      return true;
    });
  }, [tasks, searchQuery, selectedProjectId, selectedStatus, selectedPriority]);

  // Metrics calculation
  const metrics = useMemo(() => {
    const total = tasks.length;
    const inProgress = tasks.filter((t) => t.status === 'IN_PROGRESS').length;
    const done = tasks.filter((t) => t.status === 'DONE').length;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const overdue = tasks.filter((t) => {
      if (!t.due_date || t.status === 'DONE') return false;
      return new Date(t.due_date) < today;
    }).length;

    return { total, inProgress, done, overdue };
  }, [tasks]);

  const hasActiveFilters =
    Boolean(searchQuery) ||
    selectedProjectId !== 'ALL' ||
    selectedStatus !== 'ALL' ||
    selectedPriority !== 'ALL';

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedProjectId('ALL');
    setSelectedStatus('ALL');
    setSelectedPriority('ALL');
  };

  return (
    <div className="space-y-6 max-w-[1200px] mx-auto pb-12">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold tracking-tight text-[#0F172A]">My Tasks</h1>
          <span className="font-mono text-xs px-2.5 py-0.5 rounded-full bg-[#F5F5F5] text-[#171717] font-medium border border-[#E5E5E5]">
            {tasks.length} Assigned
          </span>
        </div>
        <p className="text-sm text-[#64748B] mt-1">
          Review and update all activities assigned to you across DevCatalyst projects.
        </p>
      </div>

      {/* Error message banner */}
      {errorMessage && (
        <div className="p-3 bg-[#FEF2F2] border border-[#FECACA] rounded-xl text-xs text-[#B91C1C] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            <span>{errorMessage}</span>
          </div>
          <Button variant="secondary" size="sm" onClick={fetchMyTasks}>
            Retry
          </Button>
        </div>
      )}

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white border border-[#E2E8F0] p-4 rounded-xl shadow-xs">
          <p className="text-xs text-[#64748B] font-medium">Total Assigned</p>
          <p className="text-2xl font-bold text-[#0F172A] mt-1">{metrics.total}</p>
        </div>

        <div className="bg-white border border-[#E2E8F0] p-4 rounded-xl shadow-xs">
          <div className="flex items-center justify-between">
            <p className="text-xs text-[#64748B] font-medium">In Progress</p>
            <Clock className="w-4 h-4 text-[#171717]" />
          </div>
          <p className="text-2xl font-bold text-[#090909] mt-1">{metrics.inProgress}</p>
        </div>

        <div className="bg-white border border-[#E2E8F0] p-4 rounded-xl shadow-xs">
          <div className="flex items-center justify-between">
            <p className="text-xs text-[#64748B] font-medium">Completed</p>
            <CheckCircle2 className="w-4 h-4 text-[#059669]" />
          </div>
          <p className="text-2xl font-bold text-[#059669] mt-1">{metrics.done}</p>
        </div>

        <div className="bg-white border border-[#E2E8F0] p-4 rounded-xl shadow-xs">
          <div className="flex items-center justify-between">
            <p className="text-xs text-[#64748B] font-medium">Overdue</p>
            <AlertCircle className="w-4 h-4 text-[#DC2626]" />
          </div>
          <p className="text-2xl font-bold text-[#DC2626] mt-1">{metrics.overdue}</p>
        </div>
      </div>

      {/* Composable Search and Filters Bar */}
      <div className="bg-white p-4 rounded-xl border border-[#E2E8F0] shadow-xs flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 text-[#94A3B8] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by title, code, or project..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full text-xs pl-9 pr-4 py-2 border border-[#CBD5E1] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#090909]/20 focus:border-[#090909]"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#94A3B8] hover:text-[#0F172A]"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs">
          {/* Project Filter */}
          <select
            value={selectedProjectId}
            onChange={(e) => setSelectedProjectId(e.target.value)}
            className="border border-[#CBD5E1] bg-white rounded-lg px-2.5 py-1.5 text-xs text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#090909]/20 max-w-[160px] truncate"
          >
            <option value="ALL">All Projects</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.code} - {p.title}
              </option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value as TaskStatus | 'ALL')}
            className="border border-[#CBD5E1] bg-white rounded-lg px-2.5 py-1.5 text-xs text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#090909]/20"
          >
            <option value="ALL">All Statuses</option>
            <option value="TODO">To Do</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="DONE">Done</option>
          </select>

          {/* Priority Filter */}
          <select
            value={selectedPriority}
            onChange={(e) => setSelectedPriority(e.target.value as TaskPriority | 'ALL')}
            className="border border-[#CBD5E1] bg-white rounded-lg px-2.5 py-1.5 text-xs text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#090909]/20"
          >
            <option value="ALL">All Priorities</option>
            <option value="HIGH">High</option>
            <option value="MEDIUM">Medium</option>
            <option value="LOW">Low</option>
          </select>

          {/* Clear Filters */}
          {hasActiveFilters && (
            <button
              type="button"
              onClick={clearFilters}
              className="text-xs text-[#DC2626] hover:text-[#B91C1C] font-semibold px-2 py-1.5 rounded hover:bg-[#FEF2F2] transition-colors"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Tasks Table */}
      {isLoading ? (
        <div className="bg-white border border-[#E2E8F0] rounded-xl p-8 space-y-4 animate-pulse">
          <div className="h-6 w-1/4 bg-[#E2E8F0] rounded" />
          <div className="h-10 w-full bg-[#E2E8F0] rounded" />
          <div className="h-10 w-full bg-[#E2E8F0] rounded" />
        </div>
      ) : filteredTasks.length > 0 ? (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-[#F8FAFC] border-b border-[#E2E8F0] text-[#64748B] font-semibold">
                    <th className="py-3 px-4">Task ID</th>
                    <th className="py-3 px-4">Title</th>
                    <th className="py-3 px-4">Project</th>
                    <th className="py-3 px-4">Priority</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Due Date</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F1F5F9]">
                  {filteredTasks.map((task) => {
                    const isOverdue =
                      task.due_date &&
                      task.status !== 'DONE' &&
                      new Date(task.due_date) < new Date(new Date().setHours(0, 0, 0, 0));

                    return (
                      <tr key={task.id} className="hover:bg-[#F8FAFC] transition-colors">
                        <td className="py-3 px-4 font-mono font-bold text-[#090909]">
                          {task.task_number}
                        </td>
                        <td className="py-3 px-4">
                          <p className="font-semibold text-[#0F172A] max-w-sm truncate">
                            {task.title}
                          </p>
                          {task.description && (
                            <p className="text-[11px] text-[#64748B] line-clamp-1 mt-0.5">
                              {task.description}
                            </p>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          {task.project ? (
                            <Link
                              to={`/projects/${task.project.id}/board`}
                              className="inline-flex items-center gap-1 font-medium text-[#334155] hover:text-[#090909] group"
                            >
                              <span className="font-mono text-[10px] bg-[#F1F5F9] px-1.5 py-0.5 rounded border border-[#E2E8F0]">
                                {task.project.code}
                              </span>
                              <span className="truncate max-w-[120px]">{task.project.title}</span>
                              <ExternalLink className="w-3 h-3 text-[#94A3B8] group-hover:text-[#090909]" />
                            </Link>
                          ) : (
                            <span className="text-[#94A3B8]">—</span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <Badge
                            size="sm"
                            variant={
                              task.priority === 'HIGH'
                                ? 'urgent'
                                : task.priority === 'MEDIUM'
                                ? 'warning'
                                : 'neutral'
                            }
                          >
                            {task.priority}
                          </Badge>
                        </td>
                        <td className="py-3 px-4">
                          <select
                            value={task.status}
                            onChange={(e) =>
                              handleStatusChange(task, e.target.value as TaskStatus)
                            }
                            className={`text-xs font-semibold px-2 py-1 rounded-md border focus:outline-none focus:ring-2 focus:ring-[#090909]/20 cursor-pointer ${
                              task.status === 'DONE'
                                ? 'bg-[#ECFDF5] text-[#059669] border-[#A7F3D0]'
                                : task.status === 'IN_PROGRESS'
                                ? 'bg-[#F5F5F5] text-[#171717] border-[#E5E5E5]'
                                : 'bg-[#F1F5F9] text-[#475569] border-[#E2E8F0]'
                            }`}
                          >
                            <option value="TODO">To Do</option>
                            <option value="IN_PROGRESS">In Progress</option>
                            <option value="DONE">Done</option>
                          </select>
                        </td>
                        <td className="py-3 px-4">
                          {task.due_date ? (
                            <div
                              className={`inline-flex items-center gap-1 text-[11px] font-medium ${
                                isOverdue
                                  ? 'text-[#DC2626] bg-[#FEF2F2] px-2 py-0.5 rounded border border-[#FECACA]'
                                  : 'text-[#64748B]'
                              }`}
                            >
                              {isOverdue && <AlertCircle className="w-3 h-3" />}
                              <span>{task.due_date}</span>
                            </div>
                          ) : (
                            <span className="text-[#94A3B8]">—</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            type="button"
                            title="Edit / View Details"
                            onClick={() => {
                              setSelectedTask(task);
                              setIsTaskModalOpen(true);
                            }}
                            className="p-1.5 text-[#64748B] hover:text-[#0F172A] hover:bg-[#E2E8F0] rounded-md transition-colors"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      ) : (
        /* Empty State */
        <div className="bg-white border border-[#E2E8F0] rounded-xl p-12 text-center shadow-xs">
          <div className="w-14 h-14 bg-[#ECFDF5] rounded-2xl flex items-center justify-center mx-auto mb-4 text-[#059669]">
            <CheckSquare className="w-7 h-7" />
          </div>
          <h3 className="text-lg font-bold text-[#0F172A] mb-1">
            {hasActiveFilters ? 'No Matching Tasks Found' : 'All Clear! No Assigned Tasks'}
          </h3>
          <p className="text-sm text-[#64748B] max-w-md mx-auto mb-6">
            {hasActiveFilters
              ? 'Try adjusting your filters or search keywords.'
              : 'You do not have any active task assignments right now. Check project boards to contribute.'}
          </p>

          {hasActiveFilters ? (
            <Button variant="secondary" onClick={clearFilters}>
              Reset Filters
            </Button>
          ) : (
            <Link to="/projects">
              <Button variant="primary" leftIcon={<FolderKanban className="w-4 h-4" />}>
                Browse Projects
              </Button>
            </Link>
          )}
        </div>
      )}

      {/* Edit Task Modal */}
      {selectedTask && (
        <TaskModal
          isOpen={isTaskModalOpen}
          projectId={selectedTask.project_id}
          projectMembers={[]}
          task={selectedTask}
          currentUserId={user?.id || ''}
          onClose={() => {
            setIsTaskModalOpen(false);
            setSelectedTask(null);
          }}
          onTaskSaved={() => {
            setIsTaskModalOpen(false);
            setSelectedTask(null);
            fetchMyTasks();
          }}
        />
      )}
    </div>
  );
};
