import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  FolderKanban,
  ArrowLeft,
  Users,
  Calendar,
  Clock,
  CircleDot,
  Plus,
  Edit2,
  Trash2,
  AlertCircle,
  UserPlus,
  ChevronRight,
  ListTodo,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { projectService } from '../../services/projectService';
import { taskService } from '../../services/taskService';
import type {
  Project,
  ProjectMember,
  ProjectMemberRole,
  ProjectStatus,
  ProjectTaskSummary,
  Task,
} from '../../types/database';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/common/Card';
import { EditProjectModal } from '../../components/projects/EditProjectModal';
import { ProjectMembersModal } from '../../components/projects/ProjectMembersModal';
import { TaskModal } from '../../components/tasks/TaskModal';
import { Modal } from '../../components/common/Modal';

export const ProjectDetailPage: React.FC = () => {
  const { id, projectId: paramProjectId } = useParams<{ id?: string; projectId?: string }>();
  const projectId = paramProjectId || id;
  const navigate = useNavigate();
  const { user } = useAuth();
  const userRole = user?.activeRole;

  const [project, setProject] = useState<Project | null>(null);
  const [members, setMembers] = useState<ProjectMember[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [taskSummary, setTaskSummary] = useState<ProjectTaskSummary | null>(null);
  const [userProjectRole, setUserProjectRole] = useState<ProjectMemberRole | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'members' | 'tasks'>('overview');

  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Modals
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isMembersModalOpen, setIsMembersModalOpen] = useState(false);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Authorization checks
  const isPrivileged = userRole === 'ADMIN' || userRole === 'ORGANIZER';
  const isLead =
    isPrivileged ||
    userProjectRole === 'LEAD' ||
    project?.lead_id === user?.id ||
    project?.created_by === user?.id;
  const canModifyTasks = isLead || userProjectRole === 'CONTRIBUTOR';

  const fetchProjectData = useCallback(async () => {
    if (!projectId) return;
    try {
      setIsLoading(true);
      setErrorMessage(null);

      const [projData, projTasks, summary] = await Promise.all([
        projectService.getProjectById(projectId, user?.id, userRole || undefined),
        taskService.getProjectTasks(projectId),
        projectService.getTaskSummary(projectId),
      ]);

      setProject(projData.project);
      setMembers(projData.members);
      setUserProjectRole(projData.userProjectRole);
      setTasks(projTasks);
      setTaskSummary(summary);
    } catch (err: unknown) {
      console.error('Failed to load project details:', err);
      setErrorMessage(
        (err as Error).message || 'You do not have permission to view this project.'
      );
    } finally {
      setIsLoading(false);
    }
  }, [projectId, user?.id, userRole]);

  useEffect(() => {
    fetchProjectData();
  }, [fetchProjectData]);

  const handleDeleteProject = async () => {
    if (!project || !user) return;
    try {
      setIsDeleting(true);
      await projectService.deleteProject(project.id, user.id, userRole || undefined);
      navigate('/projects');
    } catch (err: unknown) {
      alert((err as Error).message || 'Failed to delete project');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeleteTask = async (task: Task) => {
    if (!user) return;
    if (!window.confirm(`Are you sure you want to delete "${task.title}"?`)) return;
    try {
      await taskService.deleteTask(task.id, user.id, userRole || undefined);
      await fetchProjectData();
    } catch (err: unknown) {
      alert((err as Error).message || 'Failed to delete task');
    }
  };

  const statusBadgeVariant = (status: ProjectStatus) => {
    switch (status) {
      case 'ACTIVE':
        return 'primary' as const;
      case 'COMPLETED':
        return 'success' as const;
      case 'PLANNING':
        return 'info' as const;
      case 'ON_HOLD':
        return 'warning' as const;
      case 'ARCHIVED':
      default:
        return 'neutral' as const;
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-[1200px] mx-auto p-8 space-y-6 animate-pulse">
        <div className="h-6 w-32 bg-[#E2E8F0] rounded" />
        <div className="h-28 w-full bg-[#E2E8F0] rounded-xl" />
        <div className="h-64 w-full bg-[#E2E8F0] rounded-xl" />
      </div>
    );
  }

  if (errorMessage || !project) {
    return (
      <div className="max-w-md mx-auto mt-16 p-8 bg-white border border-[#E2E8F0] rounded-2xl text-center shadow-sm">
        <div className="w-12 h-12 bg-[#FEF2F2] rounded-full flex items-center justify-center mx-auto mb-4 text-[#DC2626]">
          <AlertCircle className="w-6 h-6" />
        </div>
        <h2 className="text-lg font-bold text-[#0F172A] mb-2">Access Restricted</h2>
        <p className="text-sm text-[#64748B] mb-6">
          {errorMessage || 'Project details could not be found or you do not have authorization.'}
        </p>
        <Button variant="primary" onClick={() => navigate('/projects')}>
          Return to Projects
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-[1200px] mx-auto pb-12">
      {/* Breadcrumb / Back Link */}
      <div className="flex items-center justify-between">
        <Link
          to="/projects"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-[#64748B] hover:text-[#0F172A] transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to Projects Directory
        </Link>

        {userProjectRole && (
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-[#F1F5F9] text-[#475569] border border-[#E2E8F0]">
            Your Role: <strong className="text-[#090909]">{userProjectRole}</strong>
          </span>
        )}
      </div>

      {/* Hero Header Card */}
      <div className="bg-white border border-[#E2E8F0] rounded-2xl p-6 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="font-mono text-sm font-bold text-[#171717] bg-[#F5F5F5] px-2.5 py-0.5 rounded-md border border-[#E5E5E5]">
                {project.code}
              </span>
              <Badge variant={statusBadgeVariant(project.status)}>
                {project.status.replace('_', ' ')}
              </Badge>
              {project.target_date && (
                <span className="inline-flex items-center gap-1 text-xs text-[#64748B] bg-[#F8FAFC] border border-[#E2E8F0] px-2.5 py-0.5 rounded-md">
                  <Calendar className="w-3.5 h-3.5 text-[#94A3B8]" />
                  Target: {project.target_date}
                </span>
              )}
            </div>

            <h1 className="text-2xl font-bold tracking-tight text-[#0F172A]">
              {project.title}
            </h1>

            <p className="text-sm text-[#475569] max-w-3xl leading-relaxed">
              {project.description || 'No description provided for this project.'}
            </p>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="primary"
              leftIcon={<FolderKanban className="w-4 h-4" />}
              onClick={() => navigate(`/projects/${project.id}/board`)}
            >
              Open Kanban Board
            </Button>

            {isLead && (
              <>
                <Button
                  variant="secondary"
                  leftIcon={<Users className="w-4 h-4" />}
                  onClick={() => setIsMembersModalOpen(true)}
                >
                  Manage Members
                </Button>
                <Button
                  variant="secondary"
                  leftIcon={<Edit2 className="w-4 h-4" />}
                  onClick={() => setIsEditModalOpen(true)}
                >
                  Edit
                </Button>
                <button
                  type="button"
                  title="Delete Project"
                  onClick={() => setIsDeleteModalOpen(true)}
                  className="p-2 text-[#64748B] hover:text-[#DC2626] hover:bg-[#FEF2F2] rounded-lg border border-[#E2E8F0] transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </>
            )}
          </div>
        </div>

        {/* Task Completion Progress Metric Bar */}
        {taskSummary && (
          <div className="mt-6 pt-5 border-t border-[#F1F5F9] grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="sm:col-span-2">
              <div className="flex items-center justify-between text-xs font-medium mb-1.5">
                <span className="text-[#64748B]">Project Completion Rate</span>
                <span className="font-bold text-[#0F172A]">
                  {taskSummary.completion_rate}% ({taskSummary.done} of {taskSummary.total} tasks completed)
                </span>
              </div>
              <div className="w-full bg-[#E2E8F0] rounded-full h-2.5 overflow-hidden">
                <div
                  className="bg-[#090909] h-2.5 rounded-full transition-all duration-300"
                  style={{ width: `${taskSummary.completion_rate}%` }}
                />
              </div>
            </div>

            <div className="flex items-center gap-2 bg-[#F8FAFC] border border-[#E2E8F0] px-3.5 py-2 rounded-xl">
              <Clock className="w-4 h-4 text-[#171717]" />
              <div>
                <p className="text-[11px] text-[#64748B] font-medium">In Progress</p>
                <p className="text-sm font-bold text-[#0F172A]">{taskSummary.in_progress} tasks</p>
              </div>
            </div>

            <div className="flex items-center gap-2 bg-[#F8FAFC] border border-[#E2E8F0] px-3.5 py-2 rounded-xl">
              <CircleDot className="w-4 h-4 text-[#64748B]" />
              <div>
                <p className="text-[11px] text-[#64748B] font-medium">To Do</p>
                <p className="text-sm font-bold text-[#0F172A]">{taskSummary.todo} tasks</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Tabs Navigation */}
      <div className="border-b border-[#E2E8F0] flex items-center gap-6">
        <button
          type="button"
          onClick={() => setActiveTab('overview')}
          className={`pb-3 text-sm font-semibold border-b-2 transition-all flex items-center gap-2 ${
            activeTab === 'overview'
              ? 'border-[#090909] text-[#090909]'
              : 'border-transparent text-[#64748B] hover:text-[#0F172A]'
          }`}
        >
          Overview
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('tasks')}
          className={`pb-3 text-sm font-semibold border-b-2 transition-all flex items-center gap-2 ${
            activeTab === 'tasks'
              ? 'border-[#090909] text-[#090909]'
              : 'border-transparent text-[#64748B] hover:text-[#0F172A]'
          }`}
        >
          <ListTodo className="w-4 h-4" />
          Tasks List ({tasks.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('members')}
          className={`pb-3 text-sm font-semibold border-b-2 transition-all flex items-center gap-2 ${
            activeTab === 'members'
              ? 'border-[#090909] text-[#090909]'
              : 'border-transparent text-[#64748B] hover:text-[#0F172A]'
          }`}
        >
          <Users className="w-4 h-4" />
          Members ({members.length})
        </button>
      </div>

      {/* TAB 1: OVERVIEW */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Main Info */}
          <div className="md:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>About This Initiative</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-sm text-[#334155]">
                <p className="leading-relaxed">
                  {project.description ||
                    'This project is actively managed by DevCatalyst Club team members.'}
                </p>

                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-[#F1F5F9]">
                  <div>
                    <span className="text-xs text-[#64748B] block font-medium">Start Date</span>
                    <span className="text-sm font-semibold text-[#0F172A]">
                      {project.start_date || 'Not specified'}
                    </span>
                  </div>
                  <div>
                    <span className="text-xs text-[#64748B] block font-medium">Target Date</span>
                    <span className="text-sm font-semibold text-[#0F172A]">
                      {project.target_date || 'Ongoing'}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Quick Kanban Preview Callout */}
            <div className="p-6 bg-gradient-to-r from-[#0B132B] to-[#1E293B] rounded-2xl text-white flex flex-col sm:flex-row items-center justify-between gap-4">
              <div>
                <h3 className="text-base font-bold">Interactive Kanban Board</h3>
                <p className="text-xs text-[#94A3B8] mt-1 max-w-md">
                  Drag tasks across To Do, In Progress, and Done columns with instant persistence.
                </p>
              </div>
              <Button
                variant="primary"
                onClick={() => navigate(`/projects/${project.id}/board`)}
                rightIcon={<ChevronRight className="w-4 h-4" />}
              >
                Go to Board
              </Button>
            </div>
          </div>

          {/* Sidebar Info: Project Lead & Quick Members */}
          <div className="space-y-6">
            <Card>
              <CardHeader className="flex justify-between items-center">
                <CardTitle className="text-sm">Project Leadership</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {project.lead ? (
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-[#F5F5F5] border border-[#E5E5E5] text-[#171717] flex items-center justify-center font-bold text-sm">
                      {project.lead.full_name?.charAt(0) || 'L'}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-[#0F172A]">
                        {project.lead.full_name}
                      </p>
                      <p className="text-xs text-[#64748B]">{project.lead.email}</p>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-[#94A3B8] italic">No lead currently assigned</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex justify-between items-center">
                <CardTitle className="text-sm">Team Roster ({members.length})</CardTitle>
                {isLead && (
                  <button
                    onClick={() => setIsMembersModalOpen(true)}
                    className="text-xs font-semibold text-[#090909] hover:underline"
                  >
                    Manage
                  </button>
                )}
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {members.slice(0, 5).map((m) => (
                    <div key={m.id} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-[#F1F5F9] text-[#475569] flex items-center justify-center font-bold text-[10px]">
                          {m.profile?.full_name?.charAt(0) || 'U'}
                        </div>
                        <span className="font-medium text-[#0F172A] truncate max-w-[120px]">
                          {m.profile?.full_name || 'Member'}
                        </span>
                      </div>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#F5F5F5] text-[#171717]">
                        {m.project_role}
                      </span>
                    </div>
                  ))}
                  {members.length > 5 && (
                    <button
                      onClick={() => setActiveTab('members')}
                      className="text-xs text-[#090909] font-medium hover:underline pt-2 block"
                    >
                      + {members.length - 5} more members
                    </button>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* TAB 2: TASKS LIST */}
      {activeTab === 'tasks' && (
        <Card>
          <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <CardTitle>Project Tasks</CardTitle>
              <p className="text-xs text-[#64748B] mt-0.5">
                Complete list of tasks assigned to this project.
              </p>
            </div>
            {canModifyTasks && (
              <Button
                variant="primary"
                size="sm"
                leftIcon={<Plus className="w-4 h-4" />}
                onClick={() => {
                  setEditingTask(null);
                  setIsTaskModalOpen(true);
                }}
              >
                Create Task
              </Button>
            )}
          </CardHeader>
          <CardContent className="p-0">
            {tasks.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-[#F8FAFC] border-b border-[#E2E8F0] text-[#64748B] font-semibold">
                      <th className="py-3 px-4">Task</th>
                      <th className="py-3 px-4">Title</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4">Priority</th>
                      <th className="py-3 px-4">Assignee</th>
                      <th className="py-3 px-4">Due Date</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F1F5F9]">
                    {tasks.map((task) => (
                      <tr key={task.id} className="hover:bg-[#F8FAFC] transition-colors">
                        <td className="py-3 px-4 font-mono font-bold text-[#090909]">
                          {task.task_number}
                        </td>
                        <td className="py-3 px-4 font-medium text-[#0F172A] max-w-xs truncate">
                          {task.title}
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                              task.status === 'DONE'
                                ? 'bg-[#ECFDF5] text-[#059669]'
                                : task.status === 'IN_PROGRESS'
                                ? 'bg-[#F5F5F5] text-[#171717]'
                                : 'bg-[#F1F5F9] text-[#64748B]'
                            }`}
                          >
                            {task.status.replace('_', ' ')}
                          </span>
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
                          {task.assignee ? (
                            <span className="font-medium text-[#334155]">
                              {task.assignee.full_name}
                            </span>
                          ) : (
                            <span className="text-[#94A3B8] italic">Unassigned</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-[#64748B]">
                          {task.due_date || '—'}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              type="button"
                              onClick={() => {
                                setEditingTask(task);
                                setIsTaskModalOpen(true);
                              }}
                              className="p-1 text-[#64748B] hover:text-[#0F172A] rounded"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            {canModifyTasks && (
                              <button
                                type="button"
                                onClick={() => handleDeleteTask(task)}
                                className="p-1 text-[#64748B] hover:text-[#DC2626] rounded"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-10 text-center text-xs text-[#64748B]">
                <ListTodo className="w-8 h-8 mx-auto mb-2 opacity-40 text-[#171717]" />
                <p className="font-medium">No tasks created yet</p>
                {canModifyTasks && (
                  <Button
                    variant="primary"
                    size="sm"
                    className="mt-3"
                    onClick={() => {
                      setEditingTask(null);
                      setIsTaskModalOpen(true);
                    }}
                  >
                    Create First Task
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* TAB 3: MEMBERS */}
      {activeTab === 'members' && (
        <Card>
          <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <CardTitle>Project Members</CardTitle>
              <p className="text-xs text-[#64748B] mt-0.5">
                Authorized club members collaborating on this initiative.
              </p>
            </div>
            {isLead && (
              <Button
                variant="primary"
                size="sm"
                leftIcon={<UserPlus className="w-4 h-4" />}
                onClick={() => setIsMembersModalOpen(true)}
              >
                Manage Members
              </Button>
            )}
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-[#F8FAFC] border-b border-[#E2E8F0] text-[#64748B] font-semibold">
                    <th className="py-3 px-4">Member Name</th>
                    <th className="py-3 px-4">Email</th>
                    <th className="py-3 px-4">Project Role</th>
                    <th className="py-3 px-4">Joined Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F1F5F9]">
                  {members.map((m) => (
                    <tr key={m.id} className="hover:bg-[#F8FAFC] transition-colors">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-[#F5F5F5] text-[#171717] flex items-center justify-center font-bold text-xs">
                            {m.profile?.full_name?.charAt(0) || 'M'}
                          </div>
                          <span className="font-semibold text-[#0F172A]">
                            {m.profile?.full_name || 'Member'}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-[#64748B]">
                        {m.profile?.email || '—'}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2.5 py-0.5 rounded-full font-semibold text-[11px] ${
                            m.project_role === 'LEAD'
                              ? 'bg-[#171717] text-white border border-[#090909]'
                              : m.project_role === 'CONTRIBUTOR'
                              ? 'bg-[#ECFDF5] text-[#059669] border border-[#A7F3D0]'
                              : 'bg-[#F1F5F9] text-[#64748B] border border-[#E2E8F0]'
                          }`}
                        >
                          {m.project_role}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-[#64748B]">
                        {new Date(m.joined_at).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Edit Project Modal */}
      {isEditModalOpen && (
        <EditProjectModal
          isOpen={true}
          project={project}
          currentUserId={user?.id || ''}
          userRole={userRole}
          onClose={() => setIsEditModalOpen(false)}
          onProjectUpdated={() => {
            setIsEditModalOpen(false);
            fetchProjectData();
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
            fetchProjectData();
          }}
          currentUserId={user?.id || ''}
          userRole={userRole}
          isLeadOrAdmin={isLead}
          onClose={() => setIsMembersModalOpen(false)}
        />
      )}

      {/* Task Create / Edit Modal */}
      {isTaskModalOpen && (
        <TaskModal
          isOpen={true}
          projectId={project.id}
          projectMembers={members}
          task={editingTask}
          currentUserId={user?.id || ''}
          userProjectRole={userProjectRole}
          onClose={() => {
            setIsTaskModalOpen(false);
            setEditingTask(null);
          }}
          onTaskSaved={() => {
            setIsTaskModalOpen(false);
            setEditingTask(null);
            fetchProjectData();
          }}
        />
      )}

      {/* Delete Confirmation Modal */}
      {isDeleteModalOpen && (
        <Modal
          isOpen={true}
          onClose={() => setIsDeleteModalOpen(false)}
          title="Delete Project"
          maxWidth="md"
        >
          <div className="space-y-4">
            <div className="p-3 bg-[#FEF2F2] border border-[#FECACA] rounded-lg text-xs text-[#B91C1C] flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <div>
                <strong>Warning:</strong> Deleting{' '}
                <span className="font-semibold">{project.title}</span> will permanently delete all
                tasks and members associated with this project.
              </div>
            </div>
            <p className="text-sm text-[#475569]">
              Are you sure you want to proceed?
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="secondary"
                disabled={isDeleting}
                onClick={() => setIsDeleteModalOpen(false)}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                isLoading={isDeleting}
                onClick={handleDeleteProject}
              >
                Delete Permanently
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
