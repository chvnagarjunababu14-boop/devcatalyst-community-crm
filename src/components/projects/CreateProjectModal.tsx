import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { Input } from '../common/Input';
import { projectService } from '../../services/projectService';
import type { Project, ProjectStatus, CreateProjectInput } from '../../types/database';
import type { UserProfile } from '../../types/auth';

interface CreateProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onProjectCreated: (project: Project) => void;
  currentUserId: string;
}

export const CreateProjectModal: React.FC<CreateProjectModalProps> = ({
  isOpen,
  onClose,
  onProjectCreated,
  currentUserId,
}) => {
  const [title, setTitle] = useState('');
  const [code, setCode] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<ProjectStatus>('ACTIVE');
  const [startDate, setStartDate] = useState('');
  const [targetDate, setTargetDate] = useState('');
  const [leadId, setLeadId] = useState(currentUserId);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setTitle('');
      setCode('');
      setDescription('');
      setStatus('ACTIVE');
      setStartDate('');
      setTargetDate('');
      setLeadId(currentUserId);
      setError(null);

      // Load registered users to populate lead dropdown
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
  }, [isOpen, currentUserId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Project title is required');
      return;
    }

    setIsLoading(true);
    setError(null);

    const input: CreateProjectInput = {
      title: title.trim(),
      code: code.trim() || undefined,
      description: description.trim() || undefined,
      status,
      lead_id: leadId || currentUserId,
      start_date: startDate || null,
      target_date: targetDate || null,
    };

    try {
      const created = await projectService.createProject(input, currentUserId);
      onProjectCreated(created);
      onClose();
    } catch (err: unknown) {
      const e = err as Error;
      setError(e.message || 'Failed to create project');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Create New Project"
      description="Initialize a new engineering or operational initiative for DevCatalyst Club."
      maxWidth="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 bg-[#FEF2F2] border border-[#FECACA] rounded-lg text-xs text-[#B91C1C]">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2">
            <Input
              label="Project Title"
              placeholder="e.g. AI Workflow Platform"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              autoFocus
            />
          </div>
          <div>
            <Input
              label="Project Code (Optional)"
              placeholder="e.g. PRJ-04"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              helperText="Auto-generated if empty."
            />
          </div>
        </div>

        <div className="space-y-1.5 text-left">
          <label htmlFor="create-desc" className="block text-xs font-semibold text-[#737373] uppercase tracking-wider">
            Description
          </label>
          <textarea
            id="create-desc"
            rows={3}
            placeholder="Outline goals, architecture, and deliverables..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full bg-white border border-[#E5E5E5] hover:border-[#CCCCCC] focus:border-[#090909] focus:ring-2 focus:ring-[#090909]/20 text-sm rounded-lg px-3 py-2 text-[#171717] placeholder-[#737373] transition-all outline-none"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5 text-left">
            <label htmlFor="create-status" className="block text-xs font-semibold text-[#737373] uppercase tracking-wider">
              Status
            </label>
            <select
              id="create-status"
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
            <label htmlFor="create-lead" className="block text-xs font-semibold text-[#737373] uppercase tracking-wider">
              Project Lead
            </label>
            <select
              id="create-lead"
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
            label="Start Date (Optional)"
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
          <Input
            label="Target Completion Date (Optional)"
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
            Create Project
          </Button>
        </div>
      </form>
    </Modal>
  );
};
