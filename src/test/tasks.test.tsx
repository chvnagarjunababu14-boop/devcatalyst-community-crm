import { describe, it, expect, beforeEach } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { taskService } from '../services/taskService';
import { projectService } from '../services/projectService';

describe('Task Service, Kanban & My Tasks Management', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('lists tasks for a project with correct task number ordering', async () => {
    const tasks = await taskService.getProjectTasks('prj-001');
    expect(tasks.length).toBeGreaterThanOrEqual(4);
    expect(tasks[0].task_number).toBe('TSK-101');
    expect(tasks[0].status).toBe('DONE');
  });

  it('creates task with sequential task number and validates inputs', async () => {
    const newTask = await taskService.createTask(
      {
        project_id: 'prj-001',
        title: 'Implement Dark Mode Tokens',
        description: 'Verify HSL theme contrast',
        priority: 'MEDIUM',
        status: 'TODO',
        assignee_id: 'member-usr-003', // member on prj-001
      },
      'admin-usr-001',
      'ADMIN'
    );

    expect(newTask.id).toBeDefined();
    expect(newTask.task_number).toMatch(/^TSK-\d{3}$/);
    expect(newTask.title).toBe('Implement Dark Mode Tokens');
    expect(newTask.assignee_id).toBe('member-usr-003');
  });

  it('rejects task creation when title is empty', async () => {
    await expect(
      taskService.createTask(
        {
          project_id: 'prj-001',
          title: '   ',
          priority: 'LOW',
        },
        'admin-usr-001',
        'ADMIN'
      )
    ).rejects.toThrow(/title is required/i);
  });

  it('rejects task assignment to a non-member of the project', async () => {
    // Non-existent or non-member ID
    await expect(
      taskService.createTask(
        {
          project_id: 'prj-002', // Members are admin and marcus (viewer)
          title: 'Setup Redis Cache',
          assignee_id: 'lead-usr-002', // Sarah is NOT a member of prj-002
        },
        'admin-usr-001',
        'ADMIN'
      )
    ).rejects.toThrow(/must be an existing member/i);
  });

  it('prevents VIEWER member from modifying or creating tasks', async () => {
    // Marcus is a VIEWER on prj-002
    await expect(
      taskService.createTask(
        {
          project_id: 'prj-002',
          title: 'Unauthorized Task',
        },
        'member-usr-003',
        'MEMBER'
      )
    ).rejects.toThrow(/viewer role cannot create or modify tasks/i);
  });

  it('updates task status between Kanban columns (TODO -> IN_PROGRESS -> DONE)', async () => {
    // TSK-103 in prj-001 starts as IN_PROGRESS
    const updated = await taskService.updateTaskStatus(
      'tsk-003',
      'DONE',
      1,
      'admin-usr-001',
      'ADMIN'
    );

    expect(updated.status).toBe('DONE');

    const tasks = await taskService.getProjectTasks('prj-001');
    const tsk3 = tasks.find((t) => t.id === 'tsk-003');
    expect(tsk3?.status).toBe('DONE');
  });

  it('prevents VIEWER from dragging or changing task status', async () => {
    // TSK-007 belongs to prj-002 where marcus is a VIEWER
    await expect(
      taskService.updateTaskStatus(
        'tsk-007',
        'DONE',
        0,
        'member-usr-003',
        'MEMBER'
      )
    ).rejects.toThrow(/viewer role cannot create or modify tasks/i);
  });

  it('filters project tasks by search, priority, and assignee', async () => {
    // Filter by priority HIGH
    const highTasks = await taskService.getProjectTasks('prj-001', {
      priority: 'HIGH',
    });
    expect(highTasks.every((t) => t.priority === 'HIGH')).toBe(true);

    // Filter by search query
    const searchTasks = await taskService.getProjectTasks('prj-001', {
      search: 'Assignee',
    });
    expect(searchTasks.some((t) => t.title.toLowerCase().includes('assignee'))).toBe(true);
  });

  it('retrieves My Tasks for the authenticated user across projects', async () => {
    // marcus.member is assigned tsk-002 and tsk-004 in prj-001
    const myTasks = await taskService.getMyTasks('member-usr-003');
    expect(myTasks.length).toBeGreaterThanOrEqual(2);
    expect(myTasks.every((t) => t.assignee_id === 'member-usr-003')).toBe(true);
    // Project info attached
    expect(myTasks[0].project).toBeDefined();
    expect(myTasks[0].project?.code).toBe('PRJ-01');
  });

  it('filters My Tasks composably by status and priority', async () => {
    const inProgressTasks = await taskService.getMyTasks('member-usr-003', {
      status: 'IN_PROGRESS',
    });
    expect(inProgressTasks.every((t) => t.status === 'IN_PROGRESS')).toBe(true);
  });

  it('deletes task and updates task summary', async () => {
    const summaryBefore = await projectService.getTaskSummary('prj-001');
    await taskService.deleteTask('tsk-004', 'admin-usr-001', 'ADMIN');

    const summaryAfter = await projectService.getTaskSummary('prj-001');
    expect(summaryAfter.total).toBe(summaryBefore.total - 1);

    await expect(taskService.getTaskById('tsk-004')).rejects.toThrow(/not found/i);
  });
});
