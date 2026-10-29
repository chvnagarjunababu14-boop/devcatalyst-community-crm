import React, { useState } from 'react';
import { Calendar, User, MoreVertical, AlertCircle, GripVertical } from 'lucide-react';
import type { Task, TaskStatus } from '../../types/database';
import { Badge } from '../common/Badge';

export interface TaskCardProps {
  task: Task;
  canEdit: boolean;
  onEdit?: (task: Task) => void;
  onDelete?: (task: Task) => void;
  onStatusChange?: (task: Task, newStatus: TaskStatus) => void;
  onDragStart?: (e: React.DragEvent, task: Task) => void;
  onDragEnd?: (e: React.DragEvent) => void;
}

export const TaskCard: React.FC<TaskCardProps> = ({
  task,
  canEdit,
  onEdit,
  onDelete,
  onStatusChange,
  onDragStart,
  onDragEnd,
}) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  // Check if due date is overdue
  const isOverdue = React.useMemo(() => {
    if (!task.due_date || task.status === 'DONE') return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const due = new Date(task.due_date);
    return due < today;
  }, [task.due_date, task.status]);

  const priorityVariant = {
    LOW: 'neutral' as const,
    MEDIUM: 'warning' as const,
    HIGH: 'urgent' as const,
  }[task.priority];

  const handleDragStart = (e: React.DragEvent) => {
    if (!canEdit) return;
    setIsDragging(true);
    e.dataTransfer.setData('text/plain', task.id);
    e.dataTransfer.effectAllowed = 'move';
    onDragStart?.(e, task);
  };

  const handleDragEnd = (e: React.DragEvent) => {
    setIsDragging(false);
    onDragEnd?.(e);
  };

  const nextStatusOptions: { status: TaskStatus; label: string }[] = [
    { status: 'TODO' as TaskStatus, label: 'To Do' },
    { status: 'IN_PROGRESS' as TaskStatus, label: 'In Progress' },
    { status: 'DONE' as TaskStatus, label: 'Done' },
  ].filter((opt) => opt.status !== task.status);

  return (
    <div
      role="article"
      aria-label={`Task ${task.task_number}: ${task.title}`}
      tabIndex={0}
      draggable={canEdit}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      className={`group relative bg-white border border-[#E5E5E5] rounded-xl p-3.5 shadow-xs hover:border-[#CCCCCC] hover:shadow-md transition-all duration-150 ${
        isDragging ? 'opacity-40 scale-[0.98] ring-2 ring-[#090909]/40' : 'opacity-100'
      } ${canEdit ? 'cursor-grab active:cursor-grabbing' : 'cursor-default'}`}
      onKeyDown={(e) => {
        if (e.key === 'Enter' && onEdit) {
          onEdit(task);
        }
      }}
    >
      {/* Top row: Task number, Priority, and Accessibility Menu */}
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="font-mono text-[11px] font-semibold text-[#171717] bg-[#F5F5F5] px-2 py-0.5 rounded border border-[#E5E5E5]">
            {task.task_number}
          </span>
          <Badge variant={priorityVariant} size="sm">
            {task.priority}
          </Badge>
        </div>

        <div className="flex items-center gap-1">
          {canEdit && (
            <div className="text-[#94A3B8] group-hover:text-[#64748B] transition-colors">
              <GripVertical className="w-3.5 h-3.5" aria-hidden="true" />
            </div>
          )}

          {/* Accessible Menu / Tap-to-move controls */}
          <div className="relative">
            <button
              type="button"
              aria-label={`Task actions for ${task.task_number}`}
              aria-expanded={isMenuOpen}
              className="p-1 rounded-md text-[#64748B] hover:text-[#0F172A] hover:bg-[#F1F5F9] transition-colors"
              onClick={(e) => {
                e.stopPropagation();
                setIsMenuOpen((prev) => !prev);
              }}
            >
              <MoreVertical className="w-3.5 h-3.5" />
            </button>

            {isMenuOpen && (
              <>
                <div
                  className="fixed inset-0 z-20"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsMenuOpen(false);
                  }}
                />
                <div
                  role="menu"
                  className="absolute right-0 mt-1 w-44 bg-white border border-[#E2E8F0] rounded-lg shadow-lg py-1 z-30 text-xs font-medium"
                  onClick={(e) => e.stopPropagation()}
                >
                  {onEdit && (
                    <button
                      type="button"
                      role="menuitem"
                      className="w-full text-left px-3 py-1.5 text-[#0F172A] hover:bg-[#F1F5F9] transition-colors"
                      onClick={() => {
                        setIsMenuOpen(false);
                        onEdit(task);
                      }}
                    >
                      {canEdit ? 'Edit Task' : 'View Details'}
                    </button>
                  )}

                  {/* Quick Accessible Move (satisfies requirement 7 & 8: non-drag alternative) */}
                  {canEdit && onStatusChange && nextStatusOptions.length > 0 && (
                    <div className="border-t border-[#F1F5F9] my-1 pt-1">
                      <div className="px-3 py-1 text-[10px] uppercase font-semibold text-[#94A3B8] tracking-wider">
                        Move to
                      </div>
                      {nextStatusOptions.map((opt) => (
                        <button
                          key={opt.status}
                          type="button"
                          role="menuitem"
                          className="w-full text-left px-3 py-1.5 text-[#334155] hover:bg-[#F5F5F5] hover:text-[#090909] transition-colors"
                          onClick={() => {
                            setIsMenuOpen(false);
                            onStatusChange(task, opt.status);
                          }}
                        >
                          Move to {opt.label}
                        </button>
                      ))}
                    </div>
                  )}

                  {canEdit && onDelete && (
                    <div className="border-t border-[#F1F5F9] my-1 pt-1">
                      <button
                        type="button"
                        role="menuitem"
                        className="w-full text-left px-3 py-1.5 text-[#DC2626] hover:bg-[#FEF2F2] transition-colors"
                        onClick={() => {
                          setIsMenuOpen(false);
                          onDelete(task);
                        }}
                      >
                        Delete Task
                      </button>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Task Title */}
      <h4
        className="text-sm font-semibold text-[#171717] leading-snug line-clamp-2 hover:text-[#090909] transition-colors cursor-pointer mb-1.5"
        onClick={() => onEdit?.(task)}
      >
        {task.title}
      </h4>

      {/* Task Description snippet if available */}
      {task.description && (
        <p className="text-xs text-[#737373] line-clamp-2 mb-3 leading-relaxed">
          {task.description}
        </p>
      )}

      {/* Footer: Due date + Assignee */}
      <div className="flex items-center justify-between text-xs pt-2 mt-1 border-t border-[#E5E5E5]">
        {/* Due Date Indicator */}
        {task.due_date ? (
          <div
            className={`inline-flex items-center gap-1 text-[11px] font-medium ${
              isOverdue
                ? 'text-[#DC2626] bg-[#FEF2F2] px-1.5 py-0.5 rounded border border-[#FECACA]'
                : 'text-[#737373]'
            }`}
            title={isOverdue ? 'Overdue' : 'Due date'}
          >
            {isOverdue ? (
              <AlertCircle className="w-3 h-3 text-[#DC2626]" />
            ) : (
              <Calendar className="w-3 h-3" />
            )}
            <span>{task.due_date}</span>
          </div>
        ) : (
          <span className="text-[11px] text-[#737373]">No due date</span>
        )}

        {/* Assignee Avatar / Badge */}
        {task.assignee ? (
          <div
            className="inline-flex items-center gap-1.5 pl-2"
            title={`Assigned to: ${task.assignee.full_name || 'Member'}`}
          >
            <div className="w-6 h-6 rounded-full bg-[#171717] border border-[#262626] text-white flex items-center justify-center font-bold text-[10px] overflow-hidden">
              {task.assignee.avatar_url ? (
                <img
                  src={task.assignee.avatar_url}
                  alt={task.assignee.full_name || 'Assignee'}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span>
                  {(task.assignee.full_name || 'U')
                    .split(' ')
                    .map((n) => n[0])
                    .join('')
                    .toUpperCase()
                    .slice(0, 2)}
                </span>
              )}
            </div>
            <span className="text-[11px] font-medium text-[#334155] max-w-[90px] truncate">
              {task.assignee.full_name || 'Assignee'}
            </span>
          </div>
        ) : (
          <div
            className="inline-flex items-center gap-1 text-[11px] text-[#94A3B8] italic"
            title="Unassigned"
          >
            <User className="w-3 h-3" />
            <span>Unassigned</span>
          </div>
        )}
      </div>
    </div>
  );
};
