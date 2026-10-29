import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { Input } from '../common/Input';
import { projectService } from '../../services/projectService';
import type { Project, ProjectStatus, UpdateProjectInput } from '../../types/database';
import type { UserProfile, Role } from '../../types/auth';

interface EditProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: Project | null;
  onProjectUpdated: (project: Project) => void;
  currentUserId: string;
  userRole?: Role;
}

export const EditProjectModal: React.FC<EditProjectModalProps> = ({
  isOpen,
  onClose,
  project,
  onProjectUpdated,
  currentUserId,
  userRole,
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<ProjectStatus>('ACTIVE');
  const [startDate, setStartDate] = useState('');
  const [targetDate, setTargetDate] = useState('');
  const [leadId, setLeadId] = useState('');
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (project && isOpen) {
      setTitle(project.title);
      setDescription(project.description || '');
      setStatus(project.status);
      setStartDate(project.start_date || '');
      setTargetDate(project.target_date || '');
      setLeadId(project.lead_id || currentUserId);
      setError(null);

      try {
        const raw = localStorage.getItem('devcatalyst_hub_users');
        if (raw) {
          const list = JSON.parse(raw);
          setUsers(list.map((u: any) => u.profile || { id: u.id, full_name: u.name, email: u.email }));
        }
      } catch {
        // ignore
      }
    }
  }, [project, isOpen, currentUserId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!project) return;
    if (!title.trim()) {
      setError('Project title is required');
      return;
    }

    setIsLoading(true);
    setError(null);

    const input: UpdateProjectInput = {
      title: title.trim(),
      description: description.trim() || null,
      status,
      lead_id: leadId || null,
      start_date: startDate || null,
      target_date: targetDate || null,
    };

    try {
      const updated = await projectService.updateProject(project.id, input, currentUserId, userRole);
      onProjectUpdated(updated);
      onClose();
    } catch (err: unknown) {
      const e = err as Error;
      setError(e.message || 'Failed to update project');
    } finally {
      setIsLoading(false);
    }
  };

  if (!project) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Edit Project: ${project.code}`}
      description="Update project details, status, or designated project lead."
      maxWidth="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 bg-[#FEF2F2] border border-[#FECACA] rounded-lg text-xs text-[#B91C1C]">
            {error}
          </div>
        )}

        <Input
          label="Project Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          autoFocus
        />

        <div className="space-y-1.5 text-left">
          <label htmlFor="edit-desc" className="block text-xs font-semibold text-[#737373] uppercase tracking-wider">
            Description
          </label>
          <textarea
            id="edit-desc"
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full bg-white border border-[#E5E5E5] hover:border-[#CCCCCC] focus:border-[#090909] focus:ring-2 focus:ring-[#090909]/20 text-sm rounded-lg px-3 py-2 text-[#171717] placeholder-[#737373] transition-all outline-none"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5 text-left">
            <label htmlFor="edit-status" className="block text-xs font-semibold text-[#737373] uppercase tracking-wider">
              Status
            </label>
            <select
              id="edit-status"
              value={status}
              onChange={(e) => setStatus(e.target.value as ProjectStatus)}
              className="w-full bg-white border border-[#E5E5E5] hover:border-[#CCCCCC] focus:border-[#090909] focus:ring-2 focus:ring-[#090909]/20 text-sm rounded-lg px-3 py-2 text-[#171717] transition-all outline-none"
            >
              <option value="ACTIVE">ACTIVE</option>
              <option value="PLANNING">PLANNING</option>
              <option value="ON_HOLD">ON_HOLD</option>
              <option value="COMPLETED">COMPLETED</option>
              <option value="ARCHIVED">ARCHIVED</option>
            </select>
          </div>

          <div className="space-y-1.5 text-left">
            <label htmlFor="edit-lead" className="block text-xs font-semibold text-[#737373] uppercase tracking-wider">
              Project Lead
            </label>
            <select
              id="edit-lead"
              value={leadId}
              onChange={(e) => setLeadId(e.target.value)}
              className="w-full bg-white border border-[#E5E5E5] hover:border-[#CCCCCC] focus:border-[#090909] focus:ring-2 focus:ring-[#090909]/20 text-sm rounded-lg px-3 py-2 text-[#171717] transition-all outline-none"
            >
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.full_name} ({u.email})
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Start Date"
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
          <Input
            label="Target Date"
            type="date"
            value={targetDate}
            onChange={(e) => setTargetDate(e.target.value)}
          />
        </div>

        <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#F1F5F9]">
          <Button type="button" variant="ghost" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" isLoading={isLoading}>
            Save Changes
          </Button>
        </div>
      </form>
    </Modal>
  );
};
