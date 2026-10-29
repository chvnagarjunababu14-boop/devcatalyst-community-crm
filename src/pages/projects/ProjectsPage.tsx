import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FolderKanban,
  Plus,
  Search,
  Filter,
  Users,
  Calendar,
  AlertCircle,
  Edit2,
  Trash2,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { projectService } from '../../services/projectService';
import type { Project, ProjectStatus, ProjectTaskSummary } from '../../types/database';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { Card } from '../../components/common/Card';
import { CreateProjectModal } from '../../components/projects/CreateProjectModal';
import { EditProjectModal } from '../../components/projects/EditProjectModal';
import { Modal } from '../../components/common/Modal';

export const ProjectsPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const userRole = user?.activeRole;

  const [projects, setProjects] = useState<Project[]>([]);
  const [taskSummaries, setTaskSummaries] = useState<Record<string, ProjectTaskSummary>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [filterMyProjects, setFilterMyProjects] = useState(false);

  // Modals state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [deletingProject, setDeletingProject] = useState<Project | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Permissions
  const isPrivileged = userRole === 'ADMIN' || userRole === 'ORGANIZER';
  const canCreateProject = isPrivileged || userRole === 'PROJECT_LEAD';

  const fetchProjects = useCallback(async () => {
    try {
      setIsLoading(true);
      setErrorMessage(null);
      const list = await projectService.getProjects(user?.id, userRole || undefined);
      setProjects(list);

      // Load task summaries for progress bars
      const summaries: Record<string, ProjectTaskSummary> = {};
      await Promise.all(
        list.map(async (p) => {
          try {
            const summary = await projectService.getTaskSummary(p.id);
            summaries[p.id] = summary;
          } catch {
            // ignore individual summary failure
          }
        })
      );
      setTaskSummaries(summaries);
    } catch (err: unknown) {
      console.error('Error fetching projects:', err);
      setErrorMessage((err as Error).message || 'Failed to load projects');
    } finally {
      setIsLoading(false);
    }
  }, [user?.id, userRole]);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  const handleDeleteConfirm = async () => {
    if (!deletingProject || !user) return;
    try {
      setIsDeleting(true);
      await projectService.deleteProject(deletingProject.id, user.id, userRole || undefined);
      setDeletingProject(null);
      await fetchProjects();
    } catch (err: unknown) {
      alert((err as Error).message || 'Failed to delete project');
    } finally {
      setIsDeleting(false);
    }
  };

  // Filtered projects
  const filteredProjects = useMemo(() => {
    return projects.filter((p) => {
      // Search match
      const query = searchQuery.toLowerCase().trim();
      if (query) {
        const matchesTitle = p.title.toLowerCase().includes(query);
        const matchesCode = p.code.toLowerCase().includes(query);
        const matchesDesc = p.description?.toLowerCase().includes(query);
        if (!matchesTitle && !matchesCode && !matchesDesc) return false;
      }

      // Status match
      if (selectedStatus !== 'ALL' && p.status !== selectedStatus) {
        return false;
      }

      // My Projects match
      if (filterMyProjects) {
        const isLead = p.lead_id === user?.id;
        const isCreator = p.created_by === user?.id;
        if (!isLead && !isCreator) return false;
      }

      return true;
    });
  }, [projects, searchQuery, selectedStatus, filterMyProjects, user?.id]);

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

  return (
    <div className="space-y-6 max-w-[1200px] mx-auto pb-12">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-[#0F172A]">Projects</h1>
            <span className="font-mono text-xs px-2 py-0.5 rounded-full bg-[#F5F5F5] text-[#171717] font-medium border border-[#E5E5E5]">
              {projects.length} Total
            </span>
          </div>
          <p className="text-sm text-[#64748B] mt-1">
            Manage club initiatives, track milestones, and coordinate project deliverables.
          </p>
        </div>

        {canCreateProject && (
          <Button
            variant="primary"
            leftIcon={<Plus className="w-4 h-4" />}
            onClick={() => setIsCreateModalOpen(true)}
          >
            Create Project
          </Button>
        )}
      </div>

      {/* Error Banner */}
      {errorMessage && (
        <div className="p-4 bg-[#FEF2F2] border border-[#FECACA] rounded-xl flex items-center justify-between text-sm text-[#B91C1C]">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <Button variant="secondary" size="sm" onClick={fetchProjects}>
            Retry
          </Button>
        </div>
      )}

      {/* Search and Filters Bar */}
      <div className="bg-white p-4 rounded-xl border border-[#E2E8F0] shadow-xs flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-[#94A3B8] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search projects by title, code, or description..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full text-sm pl-9 pr-4 py-2 border border-[#CBD5E1] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#090909]/20 focus:border-[#090909] transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#94A3B8] hover:text-[#0F172A]"
            >
              Clear
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Status Filter */}
          <div className="flex items-center gap-1.5 overflow-x-auto py-1">
            {(['ALL', 'ACTIVE', 'PLANNING', 'COMPLETED', 'ON_HOLD', 'ARCHIVED'] as const).map(
              (status) => (
                <button
                  key={status}
                  onClick={() => setSelectedStatus(status)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    selectedStatus === status
                      ? 'bg-[#090909] text-white shadow-xs'
                      : 'bg-[#F1F5F9] text-[#64748B] hover:text-[#0F172A] hover:bg-[#E2E8F0]'
                  }`}
                >
                  {status === 'ALL' ? 'All Status' : status.replace('_', ' ')}
                </button>
              )
            )}
          </div>

          {/* My Projects Toggle */}
          <button
            type="button"
            onClick={() => setFilterMyProjects(!filterMyProjects)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all flex items-center gap-1.5 ${
              filterMyProjects
                ? 'bg-[#171717] text-white border-[#090909]'
                : 'bg-white text-[#64748B] border-[#E2E8F0] hover:bg-[#F8FAFC]'
            }`}
          >
            <Filter className="w-3.5 h-3.5" />
            My Projects
          </button>
        </div>
      </div>

      {/* Projects List / Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1, 2, 3].map((n) => (
            <div
              key={n}
              className="bg-white border border-[#E2E8F0] rounded-xl p-5 shadow-xs animate-pulse space-y-4"
            >
              <div className="flex justify-between items-center">
                <div className="h-5 w-20 bg-[#E2E8F0] rounded" />
                <div className="h-5 w-16 bg-[#E2E8F0] rounded-full" />
              </div>
              <div className="h-6 w-3/4 bg-[#E2E8F0] rounded" />
              <div className="h-12 w-full bg-[#E2E8F0] rounded" />
              <div className="h-4 w-full bg-[#E2E8F0] rounded" />
            </div>
          ))}
        </div>
      ) : filteredProjects.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredProjects.map((project) => {
            const summary = taskSummaries[project.id] || {
              total: 0,
              todo: 0,
              in_progress: 0,
              done: 0,
              completion_rate: 0,
            };

            const canManageThisProject =
              isPrivileged || project.lead_id === user?.id || project.created_by === user?.id;

            return (
              <Card
                key={project.id}
                interactive
                className="flex flex-col justify-between group border hover:border-[#090909]/40"
              >
                <div className="p-5 flex-1 flex flex-col justify-between">
                  <div>
                    {/* Header: Project Code + Status Badge */}
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <span className="font-mono text-xs font-bold text-[#171717] bg-[#F5F5F5] px-2.5 py-1 rounded-md border border-[#E5E5E5]">
                        {project.code}
                      </span>
                      <Badge variant={statusBadgeVariant(project.status)}>
                        {project.status.replace('_', ' ')}
                      </Badge>
                    </div>

                    {/* Title & Description */}
                    <h3
                      className="text-base font-bold text-[#0F172A] tracking-tight group-hover:text-[#090909] transition-colors cursor-pointer mb-2 line-clamp-1"
                      onClick={() => navigate(`/projects/${project.id}`)}
                    >
                      {project.title}
                    </h3>
                    <p className="text-xs text-[#64748B] line-clamp-2 leading-relaxed mb-4">
                      {project.description || 'No project description provided.'}
                    </p>
                  </div>

                  {/* Progress and Metadata */}
                  <div className="space-y-3 pt-3 border-t border-[#F1F5F9]">
                    {/* Task Progress Bar */}
                    <div>
                      <div className="flex items-center justify-between text-xs mb-1.5 font-medium">
                        <span className="text-[#64748B]">Task Progress</span>
                        <span className="font-semibold text-[#0F172A]">
                          {summary.completion_rate}% ({summary.done}/{summary.total})
                        </span>
                      </div>
                      <div className="w-full bg-[#E2E8F0] rounded-full h-2 overflow-hidden">
                        <div
                          className="bg-[#090909] h-2 rounded-full transition-all duration-300"
                          style={{ width: `${summary.completion_rate}%` }}
                        />
                      </div>
                    </div>

                    {/* Project Lead & Members Count */}
                    <div className="flex items-center justify-between text-xs text-[#64748B] pt-1">
                      <div className="flex items-center gap-1.5">
                        <div className="w-5 h-5 rounded-full bg-[#F5F5F5] text-[#171717] flex items-center justify-center font-bold text-[10px]">
                          {project.lead?.full_name?.charAt(0) || 'L'}
                        </div>
                        <span className="text-[#334155] font-medium truncate max-w-[110px]">
                          {project.lead?.full_name || 'No Lead'}
                        </span>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1" title="Project Members">
                          <Users className="w-3.5 h-3.5 text-[#94A3B8]" />
                          <span>{project.members_count || 1}</span>
                        </div>

                        {project.target_date && (
                          <div className="flex items-center gap-1" title="Target Completion">
                            <Calendar className="w-3.5 h-3.5 text-[#94A3B8]" />
                            <span>{project.target_date}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Card Actions Footer */}
                <div className="px-5 py-3 bg-[#F8FAFC] border-t border-[#F1F5F9] flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => navigate(`/projects/${project.id}`)}
                    >
                      Overview
                    </Button>
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => navigate(`/projects/${project.id}/board`)}
                      rightIcon={<FolderKanban className="w-3.5 h-3.5" />}
                    >
                      Board
                    </Button>
                  </div>

                  {canManageThisProject && (
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        title="Edit Project"
                        onClick={() => setEditingProject(project)}
                        className="p-1.5 text-[#64748B] hover:text-[#0F172A] hover:bg-[#E2E8F0] rounded-md transition-colors"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        title="Delete Project"
                        onClick={() => setDeletingProject(project)}
                        className="p-1.5 text-[#64748B] hover:text-[#DC2626] hover:bg-[#FEF2F2] rounded-md transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      ) : (
        /* Empty State */
        <div className="bg-white border border-[#E2E8F0] rounded-xl p-12 text-center shadow-xs">
          <div className="w-14 h-14 bg-[#F5F5F5] rounded-2xl flex items-center justify-center mx-auto mb-4 text-[#171717]">
            <FolderKanban className="w-7 h-7" />
          </div>
          <h3 className="text-lg font-bold text-[#0F172A] mb-1">No Projects Found</h3>
          <p className="text-sm text-[#64748B] max-w-md mx-auto mb-6">
            {searchQuery || selectedStatus !== 'ALL' || filterMyProjects
              ? 'No projects matched your current filters. Try resetting your search or filter options.'
              : 'There are no active projects registered yet. Start a new initiative to begin managing club tasks.'}
          </p>

          <div className="flex items-center justify-center gap-3">
            {(searchQuery || selectedStatus !== 'ALL' || filterMyProjects) && (
              <Button
                variant="secondary"
                onClick={() => {
                  setSearchQuery('');
                  setSelectedStatus('ALL');
                  setFilterMyProjects(false);
                }}
              >
                Clear Filters
              </Button>
            )}

            {canCreateProject && (
              <Button
                variant="primary"
                leftIcon={<Plus className="w-4 h-4" />}
                onClick={() => setIsCreateModalOpen(true)}
              >
                Create Project
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Create Project Modal */}
      <CreateProjectModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        currentUserId={user?.id || ''}
        onProjectCreated={() => {
          fetchProjects();
        }}
      />

      {/* Edit Project Modal */}
      {editingProject && (
        <EditProjectModal
          isOpen={true}
          project={editingProject}
          currentUserId={user?.id || ''}
          userRole={userRole}
          onClose={() => setEditingProject(null)}
          onProjectUpdated={() => {
            setEditingProject(null);
            fetchProjects();
          }}
        />
      )}

      {/* Delete Confirmation Modal */}
      {deletingProject && (
        <Modal
          isOpen={true}
          onClose={() => setDeletingProject(null)}
          title="Delete Project"
          maxWidth="md"
        >
          <div className="space-y-4">
            <div className="p-3 bg-[#FEF2F2] border border-[#FECACA] rounded-lg text-xs text-[#B91C1C] flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <div>
                <strong>Warning:</strong> Deleting{' '}
                <span className="font-semibold">{deletingProject.title}</span> will permanently
                remove all associated tasks, board status, and member assignments.
              </div>
            </div>
            <p className="text-sm text-[#475569]">
              Are you sure you want to proceed? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="secondary"
                disabled={isDeleting}
                onClick={() => setDeletingProject(null)}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                isLoading={isDeleting}
                onClick={handleDeleteConfirm}
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
