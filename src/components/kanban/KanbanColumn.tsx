import React, { useState } from 'react';
import { Plus, CheckCircle2, Clock, CircleDot, X } from 'lucide-react';
import type { Task, TaskStatus } from '../../types/database';
import { TaskCard } from './TaskCard';

export interface KanbanColumnProps {
  status: TaskStatus;
  title: string;
  tasks: Task[];
  canEdit: boolean;
  onEditTask?: (task: Task) => void;
  onDeleteTask?: (task: Task) => void;
  onStatusChange?: (task: Task, newStatus: TaskStatus) => void;
  onQuickCreateTask?: (status: TaskStatus, title: string) => Promise<void>;
  onDropTask?: (taskId: string, targetStatus: TaskStatus) => void;
}

export const KanbanColumn: React.FC<KanbanColumnProps> = ({
  status,
  title,
  tasks,
  canEdit,
  onEditTask,
  onDeleteTask,
  onStatusChange,
  onQuickCreateTask,
  onDropTask,
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [isQuickAdding, setIsQuickAdding] = useState(false);
  const [quickTitle, setQuickTitle] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const columnConfig = {
    TODO: {
      accentColor: 'border-t-[#64748B]',
      badgeBg: 'bg-[#F1F5F9] text-[#475569]',
      icon: CircleDot,
      iconColor: 'text-[#64748B]',
      emptyText: 'No tasks to do',
      emptyHint: 'Add a new task to get started',
    },
    IN_PROGRESS: {
      accentColor: 'border-t-[#171717]',
      badgeBg: 'bg-[#171717] text-white',
      icon: Clock,
      iconColor: 'text-[#171717]',
      emptyText: 'No tasks in progress',
      emptyHint: 'Move tasks here when work begins',
    },
    DONE: {
      accentColor: 'border-t-[#059669]',
      badgeBg: 'bg-[#ECFDF5] text-[#059669]',
      icon: CheckCircle2,
      iconColor: 'text-[#059669]',
      emptyText: 'No completed tasks',
      emptyHint: 'Finished tasks will appear here',
    },
  }[status];

  const IconComponent = columnConfig.icon;

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (!canEdit) return;
    e.dataTransfer.dropEffect = 'move';
    if (!isDragOver) setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    // Check if we are really leaving the column boundary
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setIsDragOver(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (!canEdit) return;
    const taskId = e.dataTransfer.getData('text/plain');
    if (taskId && onDropTask) {
      onDropTask(taskId, status);
    }
  };

  const handleQuickSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickTitle.trim() || !onQuickCreateTask) return;
    try {
      setIsSubmitting(true);
      await onQuickCreateTask(status, quickTitle.trim());
      setQuickTitle('');
      setIsQuickAdding(false);
    } catch (err) {
      console.error('Failed to quick create task:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      data-testid={`kanban-column-${status.toLowerCase()}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`flex flex-col bg-[#FAFAFA] border border-[#E5E5E5] ${
        columnConfig.accentColor
      } border-t-4 rounded-xl min-w-[310px] w-full max-w-full h-full max-h-[calc(100vh-190px)] shadow-xs transition-all duration-150 ${
        isDragOver ? 'bg-[#F5F5F5] ring-2 ring-[#090909]/40 border-[#090909]' : ''
      }`}
    >
      {/* Column Header */}
      <div className="p-3.5 border-b border-[#E5E5E5] bg-white rounded-t-lg flex items-center justify-between">
        <div className="flex items-center gap-2">
          <IconComponent className={`w-4 h-4 ${columnConfig.iconColor}`} />
          <h3 className="text-sm font-semibold text-[#171717] tracking-tight">{title}</h3>
          <span
            className={`px-2 py-0.5 rounded-full text-xs font-semibold ${columnConfig.badgeBg}`}
          >
            {tasks.length}
          </span>
        </div>

        {canEdit && onQuickCreateTask && !isQuickAdding && (
          <button
            type="button"
            aria-label={`Add task to ${title}`}
            onClick={() => setIsQuickAdding(true)}
            className="p-1 rounded-md text-[#737373] hover:text-[#171717] hover:bg-[#F5F5F5] transition-colors"
          >
            <Plus className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Quick Add Inline Form */}
      {isQuickAdding && (
        <form onSubmit={handleQuickSubmit} className="p-3 bg-white border-b border-[#E5E5E5]">
          <input
            type="text"
            autoFocus
            placeholder="Enter task title..."
            value={quickTitle}
            onChange={(e) => setQuickTitle(e.target.value)}
            disabled={isSubmitting}
            className="w-full text-xs px-3 py-2 border border-[#E5E5E5] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#090909]/20 focus:border-[#090909] mb-2"
          />
          <div className="flex items-center justify-end gap-1.5">
            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => {
                setIsQuickAdding(false);
                setQuickTitle('');
              }}
              className="p-1 rounded text-[#737373] hover:text-[#171717] hover:bg-[#F5F5F5] text-xs font-medium"
            >
              <X className="w-4 h-4" />
            </button>
            <button
              type="submit"
              disabled={!quickTitle.trim() || isSubmitting}
              className="px-2.5 py-1 bg-[#090909] hover:bg-[#262626] text-white text-xs font-medium rounded-md shadow-xs disabled:opacity-50 transition-colors"
            >
              {isSubmitting ? 'Adding...' : 'Add'}
            </button>
          </div>
        </form>
      )}

      {/* Tasks List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3 min-h-[220px]">
        {tasks.length > 0 ? (
          tasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              canEdit={canEdit}
              onEdit={onEditTask}
              onDelete={onDeleteTask}
              onStatusChange={onStatusChange}
            />
          ))
        ) : (
          <div className="h-full flex flex-col items-center justify-center p-6 text-center border-2 border-dashed border-[#E5E5E5] rounded-xl text-xs text-[#737373]">
            <IconComponent className="w-6 h-6 mb-2 opacity-40 text-[#737373]" />
            <p className="font-medium text-[#171717]">{columnConfig.emptyText}</p>
            <p className="text-[11px] mt-0.5">{columnConfig.emptyHint}</p>
            {canEdit && onQuickCreateTask && !isQuickAdding && (
              <button
                type="button"
                onClick={() => setIsQuickAdding(true)}
                className="mt-3 inline-flex items-center gap-1 text-xs text-[#171717] font-medium hover:underline cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                Add task
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
