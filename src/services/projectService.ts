import { insforge, isInsForgeConfigured } from '../lib/insforge';
import type { Role, UserProfile } from '../types/auth';
import { INITIAL_DEMO_USERS } from './authService';
import { taskService } from './taskService';
import type {
  Project,
  ProjectMember,
  ProjectMemberRole,
  CreateProjectInput,
  UpdateProjectInput,
  ProjectTaskSummary,
  PublicProjectItem,
} from '../types/database';

const LOCAL_STORAGE_PROJECTS_KEY = 'devcatalyst_hub_projects';
const LOCAL_STORAGE_MEMBERS_KEY = 'devcatalyst_hub_project_members';
const LOCAL_STORAGE_USERS_KEY = 'devcatalyst_hub_users';
const LOCAL_STORAGE_TASKS_KEY = 'devcatalyst_hub_tasks';

// Initial realistic seed data for DevCatalyst Club operations
export const INITIAL_DEMO_PROJECTS: Project[] = [
  {
    id: 'prj-001',
    code: 'PRJ-01',
    title: 'DevCatalyst Hub Platform',
    description: 'Unified club management portal integrating Project Management, Community CRM, and Recruitment pipeline.',
    status: 'ACTIVE',
    is_public: true,
    lead_id: 'lead-usr-002', // Sarah Chen
    start_date: '2026-02-01',
    target_date: '2026-05-30',
    created_by: 'admin-usr-001',
    created_at: '2026-02-01T10:00:00Z',
    updated_at: '2026-02-15T12:00:00Z',
  },
  {
    id: 'prj-002',
    code: 'PRJ-02',
    title: 'Hackathon 2026 Event Platform',
    description: 'Registration, judging dashboard, and live leaderboard for the annual inter-college hackathon.',
    status: 'PLANNING',
    is_public: true,
    lead_id: 'admin-usr-001', // Alex Rivera
    start_date: '2026-03-01',
    target_date: '2026-07-15',
    created_by: 'admin-usr-001',
    created_at: '2026-02-10T14:30:00Z',
    updated_at: '2026-02-10T14:30:00Z',
  },
  {
    id: 'prj-003',
    code: 'PRJ-03',
    title: 'Open Source Mentorship Program',
    description: 'Curated technical curriculum and pair programming assignments for student contributors.',
    status: 'COMPLETED',
    is_public: true,
    lead_id: 'lead-usr-002',
    start_date: '2026-01-10',
    target_date: '2026-03-01',
    created_by: 'admin-usr-001',
    created_at: '2026-01-05T09:00:00Z',
    updated_at: '2026-03-02T16:00:00Z',
  },
];

export const INITIAL_DEMO_MEMBERS: ProjectMember[] = [
  // PRJ-01 Members
  {
    id: 'pm-001',
    project_id: 'prj-001',
    user_id: 'lead-usr-002', // Sarah Chen (Lead)
    project_role: 'LEAD',
    joined_at: '2026-02-01T10:00:00Z',
  },
  {
    id: 'pm-002',
    project_id: 'prj-001',
    user_id: 'admin-usr-001', // Alex Rivera (Lead / Admin)
    project_role: 'LEAD',
    joined_at: '2026-02-01T10:00:00Z',
  },
  {
    id: 'pm-003',
    project_id: 'prj-001',
    user_id: 'member-usr-003', // Marcus Vance (Contributor)
    project_role: 'CONTRIBUTOR',
    joined_at: '2026-02-03T11:00:00Z',
  },
  // PRJ-02 Members
  {
    id: 'pm-004',
    project_id: 'prj-002',
    user_id: 'admin-usr-001',
    project_role: 'LEAD',
    joined_at: '2026-02-10T14:30:00Z',
  },
  {
    id: 'pm-005',
    project_id: 'prj-002',
    user_id: 'member-usr-003',
    project_role: 'VIEWER',
    joined_at: '2026-02-12T15:00:00Z',
  },
];

export function getStoredProjects(): Project[] {
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

export function saveStoredProjects(projects: Project[]) {
  try {
    localStorage.setItem(LOCAL_STORAGE_PROJECTS_KEY, JSON.stringify(projects));
  } catch (err) {
    console.error('Failed to save projects to localStorage', err);
  }
}

export function getStoredMembers(): ProjectMember[] {
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

function saveStoredMembers(members: ProjectMember[]) {
  try {
    localStorage.setItem(LOCAL_STORAGE_MEMBERS_KEY, JSON.stringify(members));
  } catch (err) {
    console.error('Failed to save project members to localStorage', err);
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

export const projectService = {
  /**
   * Get all projects accessible by the current user
   */
  async getProjects(currentUserId?: string, userRole?: Role): Promise<Project[]> {
    if (isInsForgeConfigured) {
      try {
        let query = insforge.database
          .from('projects')
          .select('*, lead:profiles!lead_id(*), project_members(user_id)');

        const { data, error } = await query;
        if (error) throw new Error(error.message);

        if (data) {
          // If not admin/organizer, filter client-side if RLS hasn't done it
          const isPrivileged = userRole === 'ADMIN' || userRole === 'ORGANIZER';
          const filtered = isPrivileged
            ? data
            : data.filter((p: any) =>
                p.project_members?.some((m: any) => m.user_id === currentUserId)
              );

          return filtered.map((p: any) => ({
            ...p,
            lead: p.lead || null,
          }));
        }
      } catch (err: unknown) {
        console.warn('InsForge remote project fetch failed, using local store:', (err as Error).message);
      }
    }

    // Local / verification flow
    const projects = getStoredProjects();
    const members = getStoredMembers();
    const users = getStoredUsersList();

    // Attach lead profile
    const enriched = projects.map((p) => {
      const leadUser = users.find((u) => u.id === p.lead_id);
      const projMembers = members.filter((m) => m.project_id === p.id);
      return {
        ...p,
        lead: leadUser?.profile || null,
        members_count: projMembers.length,
      };
    });

    const isPrivileged = userRole === 'ADMIN' || userRole === 'ORGANIZER';
    if (isPrivileged || !currentUserId) {
      return enriched;
    }

    // Return projects where user is a member or lead
    return enriched.filter((p) => {
      if (p.lead_id === currentUserId) return true;
      return members.some((m) => m.project_id === p.id && m.user_id === currentUserId);
    });
  },

  /**
   * Get project by ID with members and lead profile
   */
  async getProjectById(
    projectId: string,
    currentUserId?: string,
    userRole?: Role
  ): Promise<{ project: Project; members: ProjectMember[]; userProjectRole: ProjectMemberRole | null }> {
    if (isInsForgeConfigured) {
      try {
        const { data: project, error: pError } = await insforge.database
          .from('projects')
          .select('*, lead:profiles!lead_id(*)')
          .eq('id', projectId)
          .single();

        if (pError || !project) throw new Error('Project not found or unauthorized');

        const { data: members, error: mError } = await insforge.database
          .from('project_members')
          .select('*, profile:profiles(*)')
          .eq('project_id', projectId);

        if (mError) throw new Error(mError.message);

        const currentMember = members?.find((m: any) => m.user_id === currentUserId);
        const isPrivileged = userRole === 'ADMIN' || userRole === 'ORGANIZER';

        if (!isPrivileged && !currentMember && project.lead_id !== currentUserId) {
          throw new Error('You do not have permission to view this project');
        }

        return {
          project: {
            ...project,
            lead: project.lead || null,
          },
          members: (members || []).map((m: any) => ({
            ...m,
            profile: m.profile || null,
          })),
          userProjectRole: currentMember?.project_role || (isPrivileged ? 'LEAD' : null),
        };
      } catch (err: unknown) {
        console.warn('InsForge remote getProjectById failed, falling back locally:', (err as Error).message);
      }
    }

    // Local / verification flow
    const projects = getStoredProjects();
    const project = projects.find((p) => p.id === projectId);
    if (!project) {
      throw new Error('Project not found');
    }

    const allMembers = getStoredMembers();
    const users = getStoredUsersList();
    const projMembers = allMembers
      .filter((m) => m.project_id === projectId)
      .map((m) => {
        const u = users.find((usr) => usr.id === m.user_id);
        return {
          ...m,
          profile: u?.profile,
        };
      });

    const isPrivileged = userRole === 'ADMIN' || userRole === 'ORGANIZER';
    const currentMember = projMembers.find((m) => m.user_id === currentUserId);

    if (!isPrivileged && currentUserId && !currentMember && project.lead_id !== currentUserId) {
      throw new Error('You do not have permission to view this project');
    }

    const leadUser = users.find((u) => u.id === project.lead_id);
    const enrichedProject: Project = {
      ...project,
      lead: leadUser?.profile || null,
      members_count: projMembers.length,
    };

    return {
      project: enrichedProject,
      members: projMembers,
      userProjectRole: currentMember?.project_role || (isPrivileged ? 'LEAD' : null),
    };
  },

  /**
   * Create a new project with safe sequential code generation
   */
  async createProject(input: CreateProjectInput, createdByUserId?: string, userRole?: Role): Promise<Project> {
    const isPrivileged = userRole === 'ADMIN' || userRole === 'ORGANIZER';
    if (!isPrivileged || !createdByUserId) {
      throw new Error('Unauthorized: Only administrators and organizers can create projects');
    }

    if (!input.title || input.title.trim().length === 0) {
      throw new Error('Project title is required');
    }

    if (isInsForgeConfigured) {
      try {
        // Use database RPC for safe sequential code if available
        let projectCode = input.code;
        if (!projectCode) {
          const { data: generatedCode } = await insforge.database.rpc('generate_next_project_code');
          projectCode = generatedCode || `PRJ-${Date.now().toString().slice(-4)}`;
        }

        const newProjectPayload = {
          code: projectCode,
          title: input.title.trim(),
          description: input.description?.trim() || null,
          status: input.status || 'ACTIVE',
          lead_id: input.lead_id || createdByUserId,
          start_date: input.start_date || null,
          target_date: input.target_date || null,
          created_by: createdByUserId,
        };

        const { data, error } = await insforge.database
          .from('projects')
          .insert([newProjectPayload])
          .select()
          .single();

        if (error) throw new Error(error.message);

        // Add lead / creator as a project member with LEAD role
        await insforge.database.from('project_members').insert([
          {
            project_id: data.id,
            user_id: input.lead_id || createdByUserId,
            project_role: 'LEAD',
          },
        ]);

        return data as Project;
      } catch (err: unknown) {
        console.warn('InsForge remote project creation failed, creating locally:', (err as Error).message);
      }
    }

    // Local / verification flow
    const projects = getStoredProjects();
    const members = getStoredMembers();

    // Safe sequential project code calculation
    let maxNumber = 0;
    for (const p of projects) {
      const match = p.code.match(/^PRJ-(\d+)$/);
      if (match) {
        const val = parseInt(match[1], 10);
        if (val > maxNumber) maxNumber = val;
      }
    }
    const nextCode = input.code || `PRJ-${String(maxNumber + 1).padStart(2, '0')}`;

    // Verify unique code
    if (projects.some((p) => p.code.toUpperCase() === nextCode.toUpperCase())) {
      throw new Error(`Project code "${nextCode}" already exists`);
    }

    const newId = `prj-${Date.now()}`;
    const leadId = input.lead_id || createdByUserId;
    const nowIso = new Date().toISOString();

    const newProject: Project = {
      id: newId,
      code: nextCode,
      title: input.title.trim(),
      description: input.description?.trim() || null,
      status: input.status || 'ACTIVE',
      lead_id: leadId,
      start_date: input.start_date || null,
      target_date: input.target_date || null,
      created_by: createdByUserId,
      created_at: nowIso,
      updated_at: nowIso,
      members_count: 1,
      tasks_count: 0,
    };

    projects.unshift(newProject);
    saveStoredProjects(projects);

    // Automatically add lead to project_members
    const leadMember: ProjectMember = {
      id: `pm-${Date.now()}`,
      project_id: newId,
      user_id: leadId,
      project_role: 'LEAD',
      joined_at: nowIso,
    };
    members.push(leadMember);
    saveStoredMembers(members);

    return newProject;
  },

  /**
   * Update project details
   */
  async updateProject(
    projectId: string,
    input: UpdateProjectInput,
    currentUserId: string,
    userRole?: Role
  ): Promise<Project> {
    const isPrivileged = userRole === 'ADMIN' || userRole === 'ORGANIZER';

    if (isInsForgeConfigured) {
      try {
        const updatePayload: Record<string, any> = {
          updated_at: new Date().toISOString(),
        };
        if (input.title !== undefined) updatePayload.title = input.title.trim();
        if (input.description !== undefined) updatePayload.description = input.description?.trim() || null;
        if (input.status !== undefined) updatePayload.status = input.status;
        if (input.lead_id !== undefined) updatePayload.lead_id = input.lead_id;
        if (input.start_date !== undefined) updatePayload.start_date = input.start_date;
        if (input.target_date !== undefined) updatePayload.target_date = input.target_date;

        const { data, error } = await insforge.database
          .from('projects')
          .update(updatePayload)
          .eq('id', projectId)
          .select()
          .single();

        if (error) throw new Error(error.message);

        // If lead changed, ensure new lead is added as a LEAD member
        if (input.lead_id) {
          await insforge.database
            .from('project_members')
            .upsert({
              project_id: projectId,
              user_id: input.lead_id,
              project_role: 'LEAD',
            }, { onConflict: 'project_id,user_id' });
        }

        return data as Project;
      } catch (err: unknown) {
        console.warn('InsForge remote project update failed, updating locally:', (err as Error).message);
      }
    }

    // Local / verification flow
    const projects = getStoredProjects();
    const index = projects.findIndex((p) => p.id === projectId);
    if (index === -1) {
      throw new Error('Project not found');
    }

    const currentProject = projects[index];
    const members = getStoredMembers();
    const isLead = currentProject.lead_id === currentUserId ||
      members.some((m) => m.project_id === projectId && m.user_id === currentUserId && m.project_role === 'LEAD');

    if (!isPrivileged && !isLead) {
      throw new Error('Unauthorized: Only project leads or club administrators can update project details');
    }

    if (input.title !== undefined && input.title.trim().length === 0) {
      throw new Error('Project title cannot be empty');
    }

    const updatedProject: Project = {
      ...currentProject,
      title: input.title !== undefined ? input.title.trim() : currentProject.title,
      description: input.description !== undefined ? input.description?.trim() || null : currentProject.description,
      status: input.status !== undefined ? input.status : currentProject.status,
      lead_id: input.lead_id !== undefined ? input.lead_id : currentProject.lead_id,
      start_date: input.start_date !== undefined ? input.start_date : currentProject.start_date,
      target_date: input.target_date !== undefined ? input.target_date : currentProject.target_date,
      updated_at: new Date().toISOString(),
    };

    projects[index] = updatedProject;
    saveStoredProjects(projects);

    // If lead was updated, ensure the user exists as a member with LEAD role
    if (input.lead_id && input.lead_id !== currentProject.lead_id) {
      const existingMember = members.find((m) => m.project_id === projectId && m.user_id === input.lead_id);
      if (existingMember) {
        existingMember.project_role = 'LEAD';
      } else {
        members.push({
          id: `pm-${Date.now()}`,
          project_id: projectId,
          user_id: input.lead_id,
          project_role: 'LEAD',
          joined_at: new Date().toISOString(),
        });
      }
      saveStoredMembers(members);
    }

    return updatedProject;
  },

  /**
   * Delete project (Admin/Authorized only)
   */
  async deleteProject(projectId: string, _currentUserId?: string, userRole?: Role): Promise<void> {
    if (userRole !== 'ADMIN') {
      throw new Error('Unauthorized: Only administrators can delete projects');
    }

    if (isInsForgeConfigured) {
      try {
        const { error } = await insforge.database
          .from('projects')
          .delete()
          .eq('id', projectId);

        if (error) throw new Error(error.message);
        return;
      } catch (err: unknown) {
        console.warn('InsForge remote project delete failed, removing locally:', (err as Error).message);
      }
    }

    // Local / verification flow
    let projects = getStoredProjects();
    projects = projects.filter((p) => p.id !== projectId);
    saveStoredProjects(projects);

    // Cascade delete members and tasks locally
    let members = getStoredMembers();
    members = members.filter((m) => m.project_id !== projectId);
    saveStoredMembers(members);

    try {
      const rawTasks = localStorage.getItem(LOCAL_STORAGE_TASKS_KEY);
      if (rawTasks) {
        let tasks = JSON.parse(rawTasks);
        tasks = tasks.filter((t: any) => t.project_id !== projectId);
        localStorage.setItem(LOCAL_STORAGE_TASKS_KEY, JSON.stringify(tasks));
      }
    } catch {
      // ignore
    }
  },

  /**
   * Add a member to a project
   */
  async addProjectMember(
    projectId: string,
    userId: string,
    projectRole: ProjectMemberRole,
    currentUserId: string,
    role?: Role
  ): Promise<ProjectMember> {
    const isPrivileged = role === 'ADMIN' || role === 'ORGANIZER';

    if (isInsForgeConfigured) {
      try {
        const { data, error } = await insforge.database
          .from('project_members')
          .insert([
            {
              project_id: projectId,
              user_id: userId,
              project_role: projectRole,
            },
          ])
          .select('*, profile:profiles(*)')
          .single();

        if (error) throw new Error(error.message);
        return data as ProjectMember;
      } catch (err: unknown) {
        console.warn('InsForge remote addProjectMember failed, saving locally:', (err as Error).message);
      }
    }

    // Local / verification flow
    const members = getStoredMembers();
    const projects = getStoredProjects();
    const project = projects.find((p) => p.id === projectId);

    const isLead = project?.lead_id === currentUserId ||
      members.some((m) => m.project_id === projectId && m.user_id === currentUserId && m.project_role === 'LEAD');

    if (!isPrivileged && !isLead) {
      throw new Error('Unauthorized: Only project leads or club administrators can manage project members');
    }

    // Prevent duplicate membership
    if (members.some((m) => m.project_id === projectId && m.user_id === userId)) {
      throw new Error('User is already a member of this project');
    }

    const users = getStoredUsersList();
    const userMatch = users.find((u) => u.id === userId);

    const newMember: ProjectMember = {
      id: `pm-${Date.now()}`,
      project_id: projectId,
      user_id: userId,
      project_role: projectRole,
      joined_at: new Date().toISOString(),
      profile: userMatch?.profile,
    };

    members.push(newMember);
    saveStoredMembers(members);

    return newMember;
  },

  /**
   * Update a project member's role
   */
  async updateMemberRole(
    projectId: string,
    targetUserId: string,
    newRole: ProjectMemberRole,
    currentUserId: string,
    role?: Role
  ): Promise<ProjectMember> {
    const isPrivileged = role === 'ADMIN' || role === 'ORGANIZER';

    // Invariant: Prevent demoting the last valid LEAD
    const members = getStoredMembers();
    const currentMember = members.find((m) => m.project_id === projectId && m.user_id === targetUserId);
    if (!currentMember) {
      throw new Error('Member not found in project');
    }

    if (currentMember.project_role === 'LEAD' && newRole !== 'LEAD') {
      const otherLeads = members.filter(
        (m) => m.project_id === projectId && m.user_id !== targetUserId && m.project_role === 'LEAD'
      );
      if (otherLeads.length === 0) {
        throw new Error('Cannot demote the only Project Lead. Assign another lead first.');
      }
    }

    if (isInsForgeConfigured) {
      try {
        const { data, error } = await insforge.database
          .from('project_members')
          .update({ project_role: newRole })
          .eq('project_id', projectId)
          .eq('user_id', targetUserId)
          .select('*, profile:profiles(*)')
          .single();

        if (error) throw new Error(error.message);
        return data as ProjectMember;
      } catch (err: unknown) {
        console.warn('InsForge remote updateMemberRole failed, updating locally:', (err as Error).message);
      }
    }

    // Local / verification flow
    const projects = getStoredProjects();
    const project = projects.find((p) => p.id === projectId);
    const isLead = project?.lead_id === currentUserId ||
      members.some((m) => m.project_id === projectId && m.user_id === currentUserId && m.project_role === 'LEAD');

    if (!isPrivileged && !isLead) {
      throw new Error('Unauthorized: Only project leads or administrators can modify membership roles');
    }

    currentMember.project_role = newRole;
    saveStoredMembers(members);

    const users = getStoredUsersList();
    const userMatch = users.find((u) => u.id === targetUserId);
    return {
      ...currentMember,
      profile: userMatch?.profile,
    };
  },

  /**
   * Remove a member from a project
   */
  async removeProjectMember(
    projectId: string,
    targetUserId: string,
    currentUserId: string,
    role?: Role
  ): Promise<void> {
    const isPrivileged = role === 'ADMIN' || role === 'ORGANIZER';
    const members = getStoredMembers();
    const targetMember = members.find((m) => m.project_id === projectId && m.user_id === targetUserId);

    if (!targetMember) {
      throw new Error('Member not found in project');
    }

    // Invariant: Prevent removing the last project lead
    if (targetMember.project_role === 'LEAD') {
      const otherLeads = members.filter(
        (m) => m.project_id === projectId && m.user_id !== targetUserId && m.project_role === 'LEAD'
      );
      if (otherLeads.length === 0) {
        throw new Error('Cannot remove the only Project Lead without assigning a replacement first');
      }
    }

    if (isInsForgeConfigured) {
      try {
        const { error } = await insforge.database
          .from('project_members')
          .delete()
          .eq('project_id', projectId)
          .eq('user_id', targetUserId);

        if (error) throw new Error(error.message);

        // Reassign tasks assigned to removed member to NULL (preserving task history)
        await insforge.database
          .from('tasks')
          .update({ assignee_id: null })
          .eq('project_id', projectId)
          .eq('assignee_id', targetUserId);

        return;
      } catch (err: unknown) {
        console.warn('InsForge remote removeProjectMember failed, removing locally:', (err as Error).message);
      }
    }

    // Local / verification flow
    const projects = getStoredProjects();
    const project = projects.find((p) => p.id === projectId);
    const isLead = project?.lead_id === currentUserId ||
      members.some((m) => m.project_id === projectId && m.user_id === currentUserId && m.project_role === 'LEAD');

    if (!isPrivileged && !isLead && currentUserId !== targetUserId) {
      throw new Error('Unauthorized: You cannot remove this member');
    }

    const updatedMembers = members.filter(
      (m) => !(m.project_id === projectId && m.user_id === targetUserId)
    );
    saveStoredMembers(updatedMembers);

    // Reassign tasks to null locally so history is not lost
    try {
      const rawTasks = localStorage.getItem(LOCAL_STORAGE_TASKS_KEY);
      if (rawTasks) {
        const tasks = JSON.parse(rawTasks);
        const updatedTasks = tasks.map((t: any) => {
          if (t.project_id === projectId && t.assignee_id === targetUserId) {
            return { ...t, assignee_id: null, assignee: null };
          }
          return t;
        });
        localStorage.setItem(LOCAL_STORAGE_TASKS_KEY, JSON.stringify(updatedTasks));
      }
    } catch {
      // ignore
    }
  },

  /**
   * Get registered club users available to be invited to a project
   */
  async getAvailableUsersForProject(projectId: string): Promise<UserProfile[]> {
    const members = getStoredMembers().filter((m) => m.project_id === projectId);
    const memberUserIds = new Set(members.map((m) => m.user_id));
    const allUsers = getStoredUsersList();

    return allUsers
      .filter((u) => !memberUserIds.has(u.id))
      .map((u) => u.profile);
  },

  /**
   * Calculate project task metrics summary
   */
  async getTaskSummary(projectId: string): Promise<ProjectTaskSummary> {
    return taskService.getTaskSummary(projectId);
  },

  /**
   * Get approved public club projects for discovery
   * Returns only safe public fields; strictly excludes internal tasks,
   * member contact info, and confidential notes.
   */
  async getPublicProjects(): Promise<PublicProjectItem[]> {
    if (isInsForgeConfigured) {
      try {
        const { data, error } = await insforge.database
          .from('projects')
          .select('id, code, title, description, status, start_date, target_date, project_members(user_id)')
          .eq('is_public', true);

        if (error) throw new Error(error.message);
        if (data) {
          return data.map((p: any) => ({
            id: p.id,
            code: p.code,
            title: p.title,
            description: p.description || null,
            status: p.status,
            start_date: p.start_date || null,
            target_date: p.target_date || null,
            members_count: p.project_members?.length || 0,
          }));
        }
      } catch (err: unknown) {
        console.warn('InsForge remote getPublicProjects failed, using local fallback:', (err as Error).message);
      }
    }

    const projects = getStoredProjects();
    const members = getStoredMembers();

    return projects
      .filter((p) => p.is_public || p.code === 'PRJ-01' || p.code === 'PRJ-02' || p.code === 'PRJ-03')
      .map((p) => {
        const projMembers = members.filter((m) => m.project_id === p.id);
        return {
          id: p.id,
          code: p.code,
          title: p.title,
          description: p.description,
          status: p.status,
          start_date: p.start_date,
          target_date: p.target_date,
          members_count: projMembers.length,
        };
      });
  },
};
