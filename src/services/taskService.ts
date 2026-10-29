import { insforge, isInsForgeConfigured } from '../lib/insforge';
import type { Role, UserProfile } from '../types/auth';
import { INITIAL_DEMO_USERS } from './authService';
import { INITIAL_DEMO_PROJECTS, INITIAL_DEMO_MEMBERS } from './projectService';
import type {
  Task,
  TaskStatus,
  TaskPriority,
  TaskWithProject,
  CreateTaskInput,
  UpdateTaskInput,
  ProjectTaskSummary,
  ProjectMemberRole,
} from '../types/database';

const LOCAL_STORAGE_TASKS_KEY = 'devcatalyst_hub_tasks';
const LOCAL_STORAGE_USERS_KEY = 'devcatalyst_hub_users';
const LOCAL_STORAGE_MEMBERS_KEY = 'devcatalyst_hub_project_members';
const LOCAL_STORAGE_PROJECTS_KEY = 'devcatalyst_hub_projects';

// Initial realistic tasks for DevCatalyst Hub development
export const INITIAL_DEMO_TASKS: Task[] = [
  {
    id: 'tsk-001',
    project_id: 'prj-001',
    task_number: 'TSK-101',
    title: 'Design high-density Kanban UI tokens',
    description: 'Finalize column gap spacing, priority badge colors, and drag handles adhering to MASTER.md.',
    status: 'DONE',
    priority: 'HIGH',
    assignee_id: 'lead-usr-002', // Sarah Chen
    due_date: '2026-02-14T18:00:00Z',
    position: 0,
    created_by: 'admin-usr-001',
    created_at: '2026-02-01T11:00:00Z',
    updated_at: '2026-02-14T18:00:00Z',
  },
  {
    id: 'tsk-002',
    project_id: 'prj-001',
    task_number: 'TSK-102',
    title: 'Implement Task Assignee Validation Trigger',
    description: 'PostgreSQL trigger verifying task assignee is an existing member of the project.',
    status: 'DONE',
    priority: 'HIGH',
    assignee_id: 'admin-usr-001', // Alex Rivera
    due_date: '2026-02-18T18:00:00Z',
    position: 1,
    created_by: 'admin-usr-001',
    created_at: '2026-02-02T10:00:00Z',
    updated_at: '2026-02-18T12:00:00Z',
  },
  {
    id: 'tsk-003',
    project_id: 'prj-001',
    task_number: 'TSK-103',
    title: 'Connect drag-and-drop state persistence',
    description: 'Enable instant optimistic updates with automatic rollback on network failure.',
    status: 'IN_PROGRESS',
    priority: 'HIGH',
    assignee_id: 'member-usr-003', // Marcus Vance
    due_date: '2026-03-01T18:00:00Z',
    position: 0,
    created_by: 'lead-usr-002',
    created_at: '2026-02-10T09:30:00Z',
    updated_at: '2026-02-15T14:20:00Z',
  },
  {
    id: 'tsk-004',
    project_id: 'prj-001',
    task_number: 'TSK-104',
    title: 'Add keyboard-accessible task movement',
    description: 'WCAG 2.1 AA accessible tap-to-move controls allowing full board manipulation without drag.',
    status: 'IN_PROGRESS',
    priority: 'MEDIUM',
    assignee_id: 'lead-usr-002',
    due_date: '2026-03-05T18:00:00Z',
    position: 1,
    created_by: 'lead-usr-002',
    created_at: '2026-02-12T11:15:00Z',
    updated_at: '2026-02-16T10:00:00Z',
  },
  {
    id: 'tsk-005',
    project_id: 'prj-001',
    task_number: 'TSK-105',
    title: 'Configure cross-project My Tasks view',
    description: 'Aggregate user tasks across all projects with composable filters by status, priority, and date.',
    status: 'TODO',
    priority: 'MEDIUM',
    assignee_id: 'member-usr-003',
    due_date: '2026-03-12T18:00:00Z',
    position: 0,
    created_by: 'lead-usr-002',
    created_at: '2026-02-15T15:00:00Z',
    updated_at: '2026-02-15T15:00:00Z',
  },
  {
    id: 'tsk-006',
    project_id: 'prj-001',
    task_number: 'TSK-106',
    title: 'Implement atomic capacity reservation for Event CRM',
    description: 'Research PostgreSQL row-locking RPC function to guarantee zero overselling.',
    status: 'TODO',
    priority: 'LOW',
    assignee_id: null,
    due_date: '2026-03-20T18:00:00Z',
    position: 1,
    created_by: 'admin-usr-001',
    created_at: '2026-02-16T16:00:00Z',
    updated_at: '2026-02-16T16:00:00Z',
  },
  // PRJ-02 tasks
  {
    id: 'tsk-007',
    project_id: 'prj-002',
    task_number: 'TSK-101',
    title: 'Draft hackathon rules and judging rubric',
    description: 'Specify scoring categories for Innovation, Code Quality, and UI/UX design.',
    status: 'IN_PROGRESS',
    priority: 'HIGH',
    assignee_id: 'admin-usr-001',
    due_date: '2026-03-10T18:00:00Z',
    position: 0,
    created_by: 'admin-usr-001',
    created_at: '2026-02-10T14:40:00Z',
    updated_at: '2026-02-14T11:00:00Z',
  },
  {
    id: 'tsk-008',
    project_id: 'prj-002',
    task_number: 'TSK-102',
    title: 'Sponsorship outreach deck',
    description: 'Prepare corporate partner sponsorship tiers and venue booking requirements.',
    status: 'TODO',
    priority: 'MEDIUM',
    assignee_id: null,
    due_date: '2026-03-25T18:00:00Z',
    position: 0,
    created_by: 'admin-usr-001',
    created_at: '2026-02-11T10:00:00Z',
    updated_at: '2026-02-11T10:00:00Z',
  },
];

function getStoredTasks(): Task[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_TASKS_KEY);
    if (!raw) {
      localStorage.setItem(LOCAL_STORAGE_TASKS_KEY, JSON.stringify(INITIAL_DEMO_TASKS));
      return INITIAL_DEMO_TASKS;
    }
    return JSON.parse(raw);
  } catch {
    return INITIAL_DEMO_TASKS;
  }
}

function saveStoredTasks(tasks: Task[]) {
  try {
    localStorage.setItem(LOCAL_STORAGE_TASKS_KEY, JSON.stringify(tasks));
  } catch (err) {
    console.error('Failed to save tasks to localStorage', err);
  }
}

function getStoredUsersList(): { id: string; name: string; email: string; profile: UserProfile }[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_USERS_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    // fallback
  }
  return INITIAL_DEMO_USERS;
}

function getStoredMembers(): { project_id: string; user_id: string; project_role: ProjectMemberRole }[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_MEMBERS_KEY);
    if (!raw) {
      localStorage.setItem(LOCAL_STORAGE_MEMBERS_KEY, JSON.stringify(INITIAL_DEMO_MEMBERS));
      return INITIAL_DEMO_MEMBERS;
    }
    return JSON.parse(raw);
  } catch {
    return INITIAL_DEMO_MEMBERS;
  }
}

function getStoredProjectsList(): { id: string; code: string; title: string }[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_PROJECTS_KEY);
    if (!raw) {
      localStorage.setItem(LOCAL_STORAGE_PROJECTS_KEY, JSON.stringify(INITIAL_DEMO_PROJECTS));
      return INITIAL_DEMO_PROJECTS;
    }
    return JSON.parse(raw);
  } catch {
    return INITIAL_DEMO_PROJECTS;
  }
}

export const taskService = {
  /**
   * Get all tasks for a project with optional composable filters
   */
  async getProjectTasks(
    projectId: string,
    filters?: {
      search?: string;
      priority?: TaskPriority;
      assigneeId?: string;
      status?: TaskStatus;
    }
  ): Promise<Task[]> {
    if (isInsForgeConfigured) {
      try {
        let query = insforge.database
          .from('tasks')
          .select('*, assignee:profiles!assignee_id(*)')
          .eq('project_id', projectId)
          .order('position', { ascending: true })
          .order('created_at', { ascending: true });

        if (filters?.priority) query = query.eq('priority', filters.priority);
        if (filters?.assigneeId) query = query.eq('assignee_id', filters.assigneeId);
        if (filters?.status) query = query.eq('status', filters.status);

        const { data, error } = await query;
        if (error) throw new Error(error.message);

        let results = (data || []).map((t: any) => ({
          ...t,
          assignee: t.assignee || null,
        }));

        if (filters?.search && filters.search.trim()) {
          const s = filters.search.toLowerCase();
          results = results.filter(
            (t: Task) =>
              t.title.toLowerCase().includes(s) ||
              t.task_number.toLowerCase().includes(s) ||
              (t.description && t.description.toLowerCase().includes(s))
          );
        }

        return results;
      } catch (err: unknown) {
        console.warn('InsForge remote task fetch failed, falling back locally:', (err as Error).message);
      }
    }

    // Local / verification flow
    const allTasks = getStoredTasks();
    const users = getStoredUsersList();

    let tasks = allTasks.filter((t) => t.project_id === projectId);

    if (filters?.priority) {
      tasks = tasks.filter((t) => t.priority === filters.priority);
    }
    if (filters?.assigneeId) {
      tasks = tasks.filter((t) => t.assignee_id === filters.assigneeId);
    }
    if (filters?.status) {
      tasks = tasks.filter((t) => t.status === filters.status);
    }
    if (filters?.search && filters.search.trim()) {
      const q = filters.search.toLowerCase().trim();
      tasks = tasks.filter(
        (t) =>
          t.title.toLowerCase().includes(q) ||
          t.task_number.toLowerCase().includes(q) ||
          (t.description && t.description.toLowerCase().includes(q))
      );
    }

    // Attach assignee profiles and sort by position
    return tasks
      .map((t) => {
        const u = users.find((usr) => usr.id === t.assignee_id);
        return {
          ...t,
          assignee: u?.profile || null,
        };
      })
      .sort((a, b) => a.position - b.position);
  },

  /**
   * Get all tasks assigned to the current user across all accessible projects
   */
  async getMyTasks(
    currentUserId: string,
    filters?: {
      search?: string;
      projectId?: string;
      priority?: TaskPriority;
      status?: TaskStatus;
    }
  ): Promise<TaskWithProject[]> {
    if (isInsForgeConfigured) {
      try {
        let query = insforge.database
          .from('tasks')
          .select('*, project:projects(id, code, title), assignee:profiles!assignee_id(*)')
          .eq('assignee_id', currentUserId)
          .order('due_date', { ascending: true, nullsFirst: false });

        if (filters?.projectId) query = query.eq('project_id', filters.projectId);
        if (filters?.priority) query = query.eq('priority', filters.priority);
        if (filters?.status) query = query.eq('status', filters.status);

        const { data, error } = await query;
        if (error) throw new Error(error.message);

        let results = (data || []).map((t: any) => ({
          ...t,
          project: t.project || undefined,
          assignee: t.assignee || null,
        }));

        if (filters?.search && filters.search.trim()) {
          const s = filters.search.toLowerCase();
          results = results.filter(
            (t: TaskWithProject) =>
              t.title.toLowerCase().includes(s) ||
              t.task_number.toLowerCase().includes(s) ||
              (t.project && t.project.title.toLowerCase().includes(s))
          );
        }

        return results;
      } catch (err: unknown) {
        console.warn('InsForge remote getMyTasks failed, falling back locally:', (err as Error).message);
      }
    }

    // Local / verification flow
    const allTasks = getStoredTasks();
    const projects = getStoredProjectsList();
    const users = getStoredUsersList();

    let myTasks = allTasks.filter((t) => t.assignee_id === currentUserId);

    if (filters?.projectId) {
      myTasks = myTasks.filter((t) => t.project_id === filters.projectId);
    }
    if (filters?.priority) {
      myTasks = myTasks.filter((t) => t.priority === filters.priority);
    }
    if (filters?.status) {
      myTasks = myTasks.filter((t) => t.status === filters.status);
    }
    if (filters?.search && filters.search.trim()) {
      const q = filters.search.toLowerCase().trim();
      myTasks = myTasks.filter((t) => {
        const proj = projects.find((p) => p.id === t.project_id);
        return (
          t.title.toLowerCase().includes(q) ||
          t.task_number.toLowerCase().includes(q) ||
          (proj && proj.title.toLowerCase().includes(q))
        );
      });
    }

    return myTasks
      .map((t) => {
        const proj = projects.find((p) => p.id === t.project_id);
        const u = users.find((usr) => usr.id === t.assignee_id);
        return {
          ...t,
          project: proj ? { id: proj.id, code: proj.code, title: proj.title } : undefined,
          assignee: u?.profile || null,
        };
      })
      .sort((a, b) => {
        if (!a.due_date) return 1;
        if (!b.due_date) return -1;
        return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
      });
  },

  /**
   * Get a single task by ID
   */
  async getTaskById(taskId: string): Promise<Task> {
    if (isInsForgeConfigured) {
      try {
        const { data, error } = await insforge.database
          .from('tasks')
          .select('*, assignee:profiles!assignee_id(*)')
          .eq('id', taskId)
          .single();

        if (error || !data) throw new Error('Task not found');
        return data as Task;
      } catch (err: unknown) {
        console.warn('InsForge remote getTaskById failed:', (err as Error).message);
      }
    }

    const allTasks = getStoredTasks();
    const task = allTasks.find((t) => t.id === taskId);
    if (!task) {
      throw new Error('Task not found');
    }

    const users = getStoredUsersList();
    const u = users.find((usr) => usr.id === task.assignee_id);
    return {
      ...task,
      assignee: u?.profile || null,
    };
  },

  /**
   * Create a new task with membership validation and safe numbering
   */
  async createTask(
    input: CreateTaskInput,
    createdByUserId?: string,
    userRole?: Role | ProjectMemberRole | null
  ): Promise<Task> {
    if (!createdByUserId) {
      throw new Error('Unauthorized: Must be an authenticated club member to create tasks');
    }

    if (!input.title || input.title.trim().length === 0) {
      throw new Error('Task title is required');
    }

    // Security check: VIEWER users cannot create tasks
    const members = getStoredMembers();
    const isLeadership = userRole === 'ADMIN' || userRole === 'ORGANIZER';
    const userMember = members.find(
      (m) => m.project_id === input.project_id && m.user_id === createdByUserId
    );

    if (!isLeadership && !userMember) {
      throw new Error('Unauthorized: You must be a member of this project to create tasks');
    }

    const effectiveRole =
      userRole === 'VIEWER' || userMember?.project_role === 'VIEWER'
        ? 'VIEWER'
        : userMember?.project_role;

    if (!isLeadership && effectiveRole === 'VIEWER') {
      throw new Error('Unauthorized: Viewer role cannot create or modify tasks');
    }

    // Validation: Task assignee must be an existing member of the project
    if (input.assignee_id) {
      const isMember = members.some(
        (m) => m.project_id === input.project_id && m.user_id === input.assignee_id
      );
      if (!isMember) {
        throw new Error('Task assignee must be an existing member of this project');
      }
    }

    if (isInsForgeConfigured) {
      try {
        // Calculate sequential task number via RPC
        const { data: taskNumber } = await insforge.database.rpc('generate_next_task_number', {
          p_project_id: input.project_id,
        });

        const status = input.status || 'TODO';
        const payload = {
          project_id: input.project_id,
          task_number: taskNumber || `TSK-${Date.now().toString().slice(-3)}`,
          title: input.title.trim(),
          description: input.description?.trim() || null,
          status,
          priority: input.priority || 'MEDIUM',
          assignee_id: input.assignee_id || null,
          due_date: input.due_date || null,
          created_by: createdByUserId,
        };

        const { data, error } = await insforge.database
          .from('tasks')
          .insert([payload])
          .select('*, assignee:profiles!assignee_id(*)')
          .single();

        if (error) throw new Error(error.message);
        return data as Task;
      } catch (err: unknown) {
        console.warn('InsForge remote task creation failed, creating locally:', (err as Error).message);
      }
    }

    // Local / verification flow
    const allTasks = getStoredTasks();
    const projTasks = allTasks.filter((t) => t.project_id === input.project_id);

    // Calculate next sequential task number
    let maxTaskNum = 100;
    for (const t of projTasks) {
      const match = t.task_number.match(/^TSK-(\d+)$/);
      if (match) {
        const val = parseInt(match[1], 10);
        if (val > maxTaskNum) maxTaskNum = val;
      }
    }
    const nextTaskNumber = `TSK-${maxTaskNum + 1}`;

    const status = input.status || 'TODO';
    const statusTasks = projTasks.filter((t) => t.status === status);
    const nextPosition = statusTasks.length;
    const nowIso = new Date().toISOString();

    const newTask: Task = {
      id: `tsk-${Date.now()}`,
      project_id: input.project_id,
      task_number: nextTaskNumber,
      title: input.title.trim(),
      description: input.description?.trim() || null,
      status,
      priority: input.priority || 'MEDIUM',
      assignee_id: input.assignee_id || null,
      due_date: input.due_date || null,
      position: nextPosition,
      created_by: createdByUserId,
      created_at: nowIso,
      updated_at: nowIso,
    };

    allTasks.push(newTask);
    saveStoredTasks(allTasks);

    const users = getStoredUsersList();
    const u = users.find((usr) => usr.id === newTask.assignee_id);
    return {
      ...newTask,
      assignee: u?.profile || null,
    };
  },

  /**
   * Update task details (title, description, priority, assignee, due_date)
   */
  async updateTask(
    taskId: string,
    input: UpdateTaskInput,
    currentUserId?: string,
    userRole?: Role | ProjectMemberRole | null
  ): Promise<Task> {
    if (input.title !== undefined && input.title.trim().length === 0) {
      throw new Error('Task title cannot be empty');
    }

    const allTasks = getStoredTasks();
    const taskIndex = allTasks.findIndex((t) => t.id === taskId);
    if (taskIndex === -1) {
      throw new Error('Task not found');
    }
    const currentTask = allTasks[taskIndex];

    const isPrivileged = userRole === 'ADMIN' || userRole === 'ORGANIZER';
    if (!isPrivileged && currentUserId) {
      const members = getStoredMembers();
      const userMember = members.find(
        (m) => m.project_id === currentTask.project_id && m.user_id === currentUserId
      );
      const effectiveRole =
        userRole === 'VIEWER' || userMember?.project_role === 'VIEWER'
          ? 'VIEWER'
          : userMember?.project_role;

      if (effectiveRole === 'VIEWER') {
        throw new Error('Unauthorized: Viewer role cannot create or modify tasks');
      }
    }

    // Validation: If assignee is changing, verify membership
    if (input.assignee_id !== undefined && input.assignee_id !== null) {
      const members = getStoredMembers();
      const isMember = members.some(
        (m) => m.project_id === currentTask.project_id && m.user_id === input.assignee_id
      );
      if (!isMember) {
        throw new Error('Task assignee must be a member of this project');
      }
    }

    if (isInsForgeConfigured) {
      try {
        const updatePayload: Record<string, any> = {
          updated_at: new Date().toISOString(),
        };
        if (input.title !== undefined) updatePayload.title = input.title.trim();
        if (input.description !== undefined) updatePayload.description = input.description?.trim() || null;
        if (input.status !== undefined) updatePayload.status = input.status;
        if (input.priority !== undefined) updatePayload.priority = input.priority;
        if (input.assignee_id !== undefined) updatePayload.assignee_id = input.assignee_id;
        if (input.due_date !== undefined) updatePayload.due_date = input.due_date;
        if (input.position !== undefined) updatePayload.position = input.position;

        const { data, error } = await insforge.database
          .from('tasks')
          .update(updatePayload)
          .eq('id', taskId)
          .select('*, assignee:profiles!assignee_id(*)')
          .single();

        if (error) throw new Error(error.message);
        return data as Task;
      } catch (err: unknown) {
        console.warn('InsForge remote updateTask failed, updating locally:', (err as Error).message);
      }
    }

    // Local / verification flow
    const updatedTask: Task = {
      ...currentTask,
      title: input.title !== undefined ? input.title.trim() : currentTask.title,
      description: input.description !== undefined ? input.description?.trim() || null : currentTask.description,
      status: input.status !== undefined ? input.status : currentTask.status,
      priority: input.priority !== undefined ? input.priority : currentTask.priority,
      assignee_id: input.assignee_id !== undefined ? input.assignee_id : currentTask.assignee_id,
      due_date: input.due_date !== undefined ? input.due_date : currentTask.due_date,
      position: input.position !== undefined ? input.position : currentTask.position,
      updated_at: new Date().toISOString(),
    };

    allTasks[taskIndex] = updatedTask;
    saveStoredTasks(allTasks);

    const users = getStoredUsersList();
    const u = users.find((usr) => usr.id === updatedTask.assignee_id);
    return {
      ...updatedTask,
      assignee: u?.profile || null,
    };
  },

  /**
   * Update task status and position (drag-and-drop or tap-to-move)
   */
  async updateTaskStatus(
    taskId: string,
    newStatus: TaskStatus,
    newPosition?: number,
    currentUserId?: string,
    userRole?: Role | ProjectMemberRole | null
  ): Promise<Task> {
    const allTasks = getStoredTasks();
    const taskIndex = allTasks.findIndex((t) => t.id === taskId);
    if (taskIndex === -1) {
      throw new Error('Task not found');
    }

    const task = allTasks[taskIndex];
    const isPrivileged = userRole === 'ADMIN' || userRole === 'ORGANIZER';
    if (!isPrivileged && currentUserId) {
      const members = getStoredMembers();
      const userMember = members.find(
        (m) => m.project_id === task.project_id && m.user_id === currentUserId
      );
      const effectiveRole =
        userRole === 'VIEWER' || userMember?.project_role === 'VIEWER'
          ? 'VIEWER'
          : userMember?.project_role;

      if (effectiveRole === 'VIEWER') {
        throw new Error('Unauthorized: Viewer role cannot create or modify tasks');
      }
    }

    const targetPosition = newPosition !== undefined 
      ? newPosition 
      : allTasks.filter((t) => t.project_id === task.project_id && t.status === newStatus && t.id !== taskId).length;

    if (isInsForgeConfigured) {
      try {
        const { data, error } = await insforge.database
          .from('tasks')
          .update({
            status: newStatus,
            position: targetPosition,
            updated_at: new Date().toISOString(),
          })
          .eq('id', taskId)
          .select('*, assignee:profiles!assignee_id(*)')
          .single();

        if (error) throw new Error(error.message);
        return data as Task;
      } catch (err: unknown) {
        console.warn('InsForge remote updateTaskStatus failed, updating locally:', (err as Error).message);
      }
    }

    // Local / verification flow
    task.status = newStatus;
    task.position = targetPosition;
    task.updated_at = new Date().toISOString();

    saveStoredTasks(allTasks);

    const users = getStoredUsersList();
    const u = users.find((usr) => usr.id === task.assignee_id);
    return {
      ...task,
      assignee: u?.profile || null,
    };
  },

  /**
   * Delete a task with permission verification
   */
  async deleteTask(
    taskId: string,
    currentUserId?: string,
    userRole?: Role | ProjectMemberRole | null
  ): Promise<void> {
    const allTasks = getStoredTasks();
    const taskIndex = allTasks.findIndex((t) => t.id === taskId);
    if (taskIndex === -1) {
      throw new Error('Task not found');
    }
    const currentTask = allTasks[taskIndex];

    const isPrivileged = userRole === 'ADMIN' || userRole === 'ORGANIZER';
    if (!isPrivileged && currentUserId) {
      const members = getStoredMembers();
      const userMember = members.find(
        (m) => m.project_id === currentTask.project_id && m.user_id === currentUserId
      );
      const effectiveRole =
        userRole === 'VIEWER' || userMember?.project_role === 'VIEWER'
          ? 'VIEWER'
          : userMember?.project_role;

      if (effectiveRole === 'VIEWER') {
        throw new Error('Unauthorized: Viewer role cannot create or modify tasks');
      }
    }

    if (isInsForgeConfigured) {
      try {
        const { error } = await insforge.database
          .from('tasks')
          .delete()
          .eq('id', taskId);

        if (error) throw new Error(error.message);
        return;
      } catch (err: unknown) {
        console.warn('InsForge remote deleteTask failed, removing locally:', (err as Error).message);
      }
    }

    // Local / verification flow
    const remainingTasks = allTasks.filter((t) => t.id !== taskId);
    saveStoredTasks(remainingTasks);
  },

  /**
   * Calculate project task metrics summary
   */
  async getTaskSummary(projectId: string): Promise<ProjectTaskSummary> {
    const tasks = await this.getProjectTasks(projectId);
    const total = tasks.length;
    const todo = tasks.filter((t) => t.status === 'TODO').length;
    const in_progress = tasks.filter((t) => t.status === 'IN_PROGRESS').length;
    const done = tasks.filter((t) => t.status === 'DONE').length;
    const completion_rate = total > 0 ? Math.round((done / total) * 100) : 0;

    return {
      total,
      todo,
      in_progress,
      done,
      completion_rate,
    };
  },
};
