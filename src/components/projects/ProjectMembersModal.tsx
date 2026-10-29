import React, { useState, useEffect } from 'react';
import { UserPlus, Trash2, AlertCircle } from 'lucide-react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { projectService } from '../../services/projectService';
import type { Project, ProjectMember, ProjectMemberRole } from '../../types/database';
import type { UserProfile, Role } from '../../types/auth';

interface ProjectMembersModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: Project | null;
  members: ProjectMember[];
  onMembersChanged: () => void;
  currentUserId: string;
  userRole?: Role;
  isLeadOrAdmin: boolean;
}

export const ProjectMembersModal: React.FC<ProjectMembersModalProps> = ({
  isOpen,
  onClose,
  project,
  members,
  onMembersChanged,
  currentUserId,
  userRole,
  isLeadOrAdmin,
}) => {
  const [availableUsers, setAvailableUsers] = useState<UserProfile[]>([]);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [selectedRole, setSelectedRole] = useState<ProjectMemberRole>('CONTRIBUTOR');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (project && isOpen) {
      setError(null);
      projectService.getAvailableUsersForProject(project.id).then((users) => {
        setAvailableUsers(users);
        if (users.length > 0) setSelectedUserId(users[0].id);
      });
    }
  }, [project, isOpen, members]);

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!project || !selectedUserId) return;

    setIsLoading(true);
    setError(null);

    try {
      await projectService.addProjectMember(
        project.id,
        selectedUserId,
        selectedRole,
        currentUserId,
        userRole
      );
      onMembersChanged();
    } catch (err: unknown) {
      const e = err as Error;
      setError(e.message || 'Failed to add member');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRoleChange = async (targetUserId: string, newRole: ProjectMemberRole) => {
    if (!project) return;
    setError(null);
    try {
      await projectService.updateMemberRole(project.id, targetUserId, newRole, currentUserId, userRole);
      onMembersChanged();
    } catch (err: unknown) {
      const e = err as Error;
      setError(e.message || 'Failed to update member role');
    }
  };

  const handleRemoveMember = async (targetUserId: string) => {
    if (!project) return;
    if (!window.confirm('Are you sure you want to remove this member from the project? Their assigned tasks will remain in the project as unassigned.')) {
      return;
    }

    setError(null);
    try {
      await projectService.removeProjectMember(project.id, targetUserId, currentUserId, userRole);
      onMembersChanged();
    } catch (err: unknown) {
      const e = err as Error;
      setError(e.message || 'Failed to remove member');
    }
  };

  if (!project) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Project Members: ${project.code}`}
      description="Manage contributors, designated leads, and viewing permissions for this project."
      maxWidth="lg"
    >
      <div className="space-y-6">
        {error && (
          <div className="p-3 bg-[#FEF2F2] border border-[#FECACA] rounded-lg text-xs text-[#B91C1C] flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <p>{error}</p>
          </div>
        )}

        {/* Add Member Form (Leadership only) */}
        {isLeadOrAdmin && availableUsers.length > 0 && (
          <form onSubmit={handleAddMember} className="p-4 bg-[#FAFAFA] border border-[#E5E5E5] rounded-xl space-y-3">
            <h4 className="text-xs font-semibold text-[#171717] uppercase tracking-wider flex items-center gap-1.5">
              <UserPlus className="w-3.5 h-3.5 text-[#171717]" />
              Add Registered Member
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <div className="sm:col-span-2">
                <select
                  value={selectedUserId}
                  onChange={(e) => setSelectedUserId(e.target.value)}
                  className="w-full bg-white border border-[#E5E5E5] rounded-lg px-3 py-2 text-xs text-[#171717] outline-none"
                  aria-label="Select registered user to add"
                >
                  {availableUsers.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.full_name} ({u.email})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <select
                  value={selectedRole}
                  onChange={(e) => setSelectedRole(e.target.value as ProjectMemberRole)}
                  className="w-full bg-white border border-[#E5E5E5] rounded-lg px-3 py-2 text-xs text-[#171717] outline-none"
                  aria-label="Select project role"
                >
                  <option value="CONTRIBUTOR">CONTRIBUTOR</option>
                  <option value="LEAD">LEAD</option>
                  <option value="VIEWER">VIEWER</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end">
              <Button type="submit" variant="primary" size="sm" isLoading={isLoading}>
                Add to Project
              </Button>
            </div>
          </form>
        )}

        {/* Current Members List */}
        <div>
          <h4 className="text-xs font-semibold text-[#737373] uppercase tracking-wider mb-2">
            Active Members ({members.length})
          </h4>
          <div className="divide-y divide-[#E5E5E5] border border-[#E5E5E5] rounded-xl overflow-hidden bg-white">
            {members.map((m) => {
              const isSelf = m.user_id === currentUserId;
              return (
                <div key={m.id} className="p-3.5 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-full bg-[#171717] text-white font-bold text-xs flex items-center justify-center shrink-0 border border-[#262626]">
                      {m.profile?.full_name ? m.profile.full_name.slice(0, 2).toUpperCase() : 'U'}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-[#171717] truncate">
                        {m.profile?.full_name || 'Member'} {isSelf && <span className="text-[#090909] font-medium">(You)</span>}
                      </p>
                      <p className="text-[11px] text-[#737373] truncate">{m.profile?.email}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {isLeadOrAdmin ? (
                      <select
                        value={m.project_role}
                        onChange={(e) => handleRoleChange(m.user_id, e.target.value as ProjectMemberRole)}
                        className="bg-[#F8FAFC] border border-[#E2E8F0] text-xs rounded px-2 py-1 outline-none font-medium text-[#0F172A]"
                        aria-label={`Role for ${m.profile?.full_name}`}
                      >
                        <option value="CONTRIBUTOR">Contributor</option>
                        <option value="LEAD">Lead</option>
                        <option value="VIEWER">Viewer</option>
                      </select>
                    ) : (
                      <span className="text-xs font-medium px-2 py-0.5 rounded bg-[#F1F5F9] text-[#475569]">
                        {m.project_role}
                      </span>
                    )}

                    {isLeadOrAdmin && (
                      <button
                        onClick={() => handleRemoveMember(m.user_id)}
                        className="p-1.5 text-[#94A3B8] hover:text-[#DC2626] hover:bg-[#FEF2F2] rounded transition-colors"
                        title="Remove from project"
                        aria-label={`Remove ${m.profile?.full_name} from project`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="flex justify-end pt-3 border-t border-[#F1F5F9]">
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </Modal>
  );
};
