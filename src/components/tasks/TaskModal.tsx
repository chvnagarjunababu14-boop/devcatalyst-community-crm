import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { Input } from '../common/Input';
import { taskService } from '../../services/taskService';
import type { Task, TaskPriority, TaskStatus, ProjectMember } from '../../types/database';

interface TaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  task?: Task | null; // If provided, edit mode; otherwise create mode
  defaultStatus?: TaskStatus;
  projectMembers: ProjectMember[];
  onTaskSaved: (task: Task) => void;
  currentUserId: string;
  userProjectRole?: any;
}

export const TaskModal: React.FC<TaskModalProps> = ({
  isOpen,
  onClose,
  projectId,
  task,
  defaultStatus = 'TODO',
  projectMembers,
  onTaskSaved,
  currentUserId,
  userProjectRole,
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<TaskStatus>(defaultStatus);
  const [priority, setPriority] = useState<TaskPriority>('MEDIUM');
  const [assigneeId, setAssigneeId] = useState<string>('');
  const [dueDate, setDueDate] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isEdit = Boolean(task);

  useEffect(() => {
    if (isOpen) {
      if (task) {
        setTitle(task.title);
        setDescription(task.description || '');
        setStatus(task.status);
        setPriority(task.priority);
        setAssigneeId(task.assignee_id || '');
        setDueDate(task.due_date ? task.due_date.split('T')[0] : '');
      } else {
        setTitle('');
        setDescription('');
        setStatus(defaultStatus);
        setPriority('MEDIUM');
        setAssigneeId('');
        setDueDate('');
      }
      setError(null);
    }
  }, [isOpen, task, defaultStatus]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Task title is required');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      if (isEdit && task) {
        const updated = await taskService.updateTask(
          task.id,
          {
            title: title.trim(),
            description: description.trim() || null,
            status,
            priority,
            assignee_id: assigneeId || null,
            due_date: dueDate ? new Date(dueDate).toISOString() : null,
          },
          currentUserId,
          userProjectRole
        );
        onTaskSaved(updated);
      } else {
        const created = await taskService.createTask(
          {
            project_id: projectId,
            title: title.trim(),
            description: description.trim() || null,
            status,
            priority,
            assignee_id: assigneeId || null,
            due_date: dueDate ? new Date(dueDate).toISOString() : null,
          },
          currentUserId,
          userProjectRole
        );
        onTaskSaved(created);
      }
      onClose();
    } catch (err: unknown) {
      const e = err as Error;
      setError(e.message || 'Failed to save task');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEdit ? `Edit Task: ${task?.task_number}` : 'Create Task'}
      description={isEdit ? 'Update task details, assignment, or priority' : 'Add a new work item to the project board'}
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 bg-[#FEF2F2] border border-[#FECACA] rounded-lg text-xs text-[#B91C1C]">
            {error}
          </div>
        )}

        <Input
          label="Task Title"
          placeholder="e.g. Implement user authentication"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          autoFocus
        />

        <div className="space-y-1.5 text-left">
          <label htmlFor="task-desc" className="block text-xs font-semibold text-[#475569] uppercase tracking-wider">
            Description
          </label>
          <textarea
            id="task-desc"
            rows={3}
            placeholder="Technical details, acceptance criteria, or relevant links..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full bg-white border border-[#E5E5E5] hover:border-[#CCCCCC] focus:border-[#090909] focus:ring-2 focus:ring-[#090909]/20 text-sm rounded-lg px-3 py-2 text-[#171717] placeholder-[#737373] transition-all outline-none"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5 text-left">
            <label htmlFor="task-status" className="block text-xs font-semibold text-[#737373] uppercase tracking-wider">
              Status Column
            </label>
            <select
              id="task-status"
              value={status}
              onChange={(e) => setStatus(e.target.value as TaskStatus)}
              className="w-full bg-white border border-[#E5E5E5] hover:border-[#CCCCCC] focus:border-[#090909] focus:ring-2 focus:ring-[#090909]/20 text-sm rounded-lg px-3 py-2 text-[#171717] outline-none"
            >
              <option value="TODO">TODO</option>
              <option value="IN_PROGRESS">IN_PROGRESS</option>
              <option value="DONE">DONE</option>
            </select>
          </div>

          <div className="space-y-1.5 text-left">
            <label htmlFor="task-priority" className="block text-xs font-semibold text-[#737373] uppercase tracking-wider">
              Priority
            </label>
            <select
              id="task-priority"
              value={priority}
              onChange={(e) => setPriority(e.target.value as TaskPriority)}
              className="w-full bg-white border border-[#E5E5E5] hover:border-[#CCCCCC] focus:border-[#090909] focus:ring-2 focus:ring-[#090909]/20 text-sm rounded-lg px-3 py-2 text-[#171717] outline-none"
            >
              <option value="LOW">LOW</option>
              <option value="MEDIUM">MEDIUM</option>
              <option value="HIGH">HIGH</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5 text-left">
            <label htmlFor="task-assignee" className="block text-xs font-semibold text-[#737373] uppercase tracking-wider">
              Assignee (Project Member)
            </label>
            <select
              id="task-assignee"
              value={assigneeId}
              onChange={(e) => setAssigneeId(e.target.value)}
              className="w-full bg-white border border-[#E5E5E5] hover:border-[#CCCCCC] focus:border-[#090909] focus:ring-2 focus:ring-[#090909]/20 text-sm rounded-lg px-3 py-2 text-[#171717] outline-none"
            >
              <option value="">Unassigned</option>
              {projectMembers.map((m) => (
                <option key={m.user_id} value={m.user_id}>
                  {m.profile?.full_name || m.user_id} ({m.project_role})
                </option>
              ))}
            </select>
          </div>

          <Input
            label="Due Date"
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
          />
        </div>

        <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#F1F5F9]">
          <Button type="button" variant="ghost" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" isLoading={isLoading}>
            {isEdit ? 'Save Changes' : 'Create Task'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
