import { insforge, isInsForgeConfigured } from '../lib/insforge';
import type { Role } from '../types/auth';
import type {
  MemberRecord,
  MembershipStatus,
  ClubDomain,
  Project,
  ProjectMember,
} from '../types/database';
import { getStoredProjects, getStoredMembers } from './projectService';
import { getStoredAttendance } from './attendanceService';
import { getStoredUsers } from './authService';

const LOCAL_STORAGE_MEMBER_META_KEY = 'devcatalyst_hub_member_metadata';

interface LocalMemberMeta {
  id: string;
  user_id: string;
  membership_status: MembershipStatus;
  domains: ClubDomain[];
  skills: string[];
  interests: string[];
  joined_at: string;
  department: string | null;
  year_of_study: string | null;
  application_id?: string | null;
}

export const INITIAL_DEMO_MEMBER_METADATA: LocalMemberMeta[] = [
  {
    id: 'meta-001',
    user_id: 'admin-usr-001',
    membership_status: 'ACTIVE',
    domains: ['ENGINEERING', 'OPERATIONS'],
    skills: ['System Architecture', 'TypeScript', 'PostgreSQL', 'Cloud Security'],
    interests: ['Distributed Systems', 'Agentic Workflows', 'Developer Tooling'],
    joined_at: '2026-01-15T00:00:00Z',
    department: 'Computer Science & Engineering',
    year_of_study: 'Senior / 4th Year',
  },
  {
    id: 'meta-002',
    user_id: 'lead-usr-002',
    membership_status: 'ACTIVE',
    domains: ['ENGINEERING', 'PRODUCT'],
    skills: ['React', 'Next.js', 'Vite', 'GraphQL', 'Tailwind'],
    interests: ['Open Source Tooling', 'Design Systems', 'AI Interfaces'],
    joined_at: '2026-02-01T00:00:00Z',
    department: 'Software Engineering',
    year_of_study: 'Junior / 3rd Year',
  },
  {
    id: 'meta-003',
    user_id: 'member-usr-003',
    membership_status: 'ACTIVE',
    domains: ['ENGINEERING', 'DESIGN'],
    skills: ['JavaScript', 'HTML/CSS', 'Python', 'Figma'],
    interests: ['Web Accessibility', 'Community Hackathons', 'UI Prototyping'],
    joined_at: '2026-03-10T00:00:00Z',
    department: 'Information Technology',
    year_of_study: 'Sophomore / 2nd Year',
  },
];

export function getStoredMemberMetadata(): LocalMemberMeta[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_MEMBER_META_KEY);
    if (!raw) {
      localStorage.setItem(LOCAL_STORAGE_MEMBER_META_KEY, JSON.stringify(INITIAL_DEMO_MEMBER_METADATA));
      return INITIAL_DEMO_MEMBER_METADATA;
    }
    return JSON.parse(raw);
  } catch {
    return INITIAL_DEMO_MEMBER_METADATA;
  }
}

export function saveStoredMemberMetadata(metaList: LocalMemberMeta[]) {
  try {
    localStorage.setItem(LOCAL_STORAGE_MEMBER_META_KEY, JSON.stringify(metaList));
  } catch (err) {
    console.error('Failed to save member metadata to localStorage', err);
  }
}

export const memberService = {
  /**
   * Get members directory with search and multi-facet filtering
   */
  async getMembers(
    filters?: {
      search?: string;
      domain?: ClubDomain | 'ALL';
      status?: MembershipStatus | 'ALL';
      role?: Role | 'ALL';
    },
    currentUserId?: string,
    userRole?: Role
  ): Promise<MemberRecord[]> {
    const isAuthorizedMember = Boolean(currentUserId);
    const isAdmin = userRole === 'ADMIN' || userRole === 'ORGANIZER';

    // 1. InsForge remote fetch
    if (isInsForgeConfigured) {
      try {
        const { data: profiles, error } = await insforge.database
          .from('profiles')
          .select('*, user_roles(role), member_metadata(*)');

        if (error) throw new Error(error.message);

        // Fetch projects & attendance for enrichment
        const members: MemberRecord[] = (profiles || []).map((p: any) => {
          const roles = (p.user_roles || []).map((r: any) => r.role as Role);
          const meta = p.member_metadata?.[0] || {};
          return {
            id: p.id,
            email: isAuthorizedMember ? p.email : `${p.email.slice(0, 3)}***@devcatalyst.club`,
            full_name: p.full_name,
            avatar_url: p.avatar_url,
            bio: p.bio,
            github_handle: p.github_handle,
            phone: isAdmin ? p.phone : null,
            roles,
            membership_status: meta.membership_status || 'ACTIVE',
            domains: meta.domains || ['ENGINEERING'],
            skills: meta.skills || [],
            interests: meta.interests || [],
            joined_at: meta.joined_at || p.created_at,
            department: meta.department || null,
            year_of_study: meta.year_of_study || null,
          };
        });

        return members;
      } catch (err: unknown) {
        console.warn('InsForge remote getMembers failed, using local fallback:', (err as Error).message);
      }
    }

    // 2. Local fallback resolution
    const users = getStoredUsers();
    const metaList = getStoredMemberMetadata();
    const projects: Project[] = getStoredProjects();
    const projectMembers: ProjectMember[] = getStoredMembers();
    const attendance = getStoredAttendance();

    let members: MemberRecord[] = users.map((u) => {
      const meta = metaList.find((m) => m.user_id === u.id) || {
        membership_status: 'ACTIVE' as MembershipStatus,
        domains: ['ENGINEERING' as ClubDomain],
        skills: [],
        interests: [],
        joined_at: u.profile?.created_at || new Date().toISOString(),
        department: null,
        year_of_study: null,
      };

      // Projects membership
      const userProjects = projectMembers
        .filter((pm: ProjectMember) => pm.user_id === u.id)
        .map((pm: ProjectMember) => {
          const prj = projects.find((p: Project) => p.id === pm.project_id);
          return {
            id: pm.project_id,
            code: prj?.code || 'PRJ',
            title: prj?.title || 'Club Project',
            project_role: pm.project_role,
          };
        });

      // Attendance count
      const attendedCount = attendance.filter((a) => a.checked_in_by === u.id || a.registration_id === u.id).length;

      return {
        id: u.id,
        email: isAuthorizedMember ? u.email : `${u.email.slice(0, 3)}***@devcatalyst.club`,
        full_name: u.profile?.full_name || u.name,
        avatar_url: u.profile?.avatar_url || null,
        bio: u.profile?.bio || null,
        github_handle: u.profile?.github_handle || null,
        phone: isAdmin ? (u.profile?.phone || null) : null,
        roles: u.roles || ['MEMBER'],
        membership_status: meta.membership_status,
        domains: meta.domains,
        skills: meta.skills,
        interests: meta.interests,
        joined_at: meta.joined_at,
        department: meta.department,
        year_of_study: meta.year_of_study,
        projects: userProjects,
        event_attendance_count: attendedCount,
      };
    });

    // Filters
    if (filters?.domain && filters.domain !== 'ALL') {
      members = members.filter((m) => m.domains.includes(filters.domain as ClubDomain));
    }
    if (filters?.status && filters.status !== 'ALL') {
      members = members.filter((m) => m.membership_status === filters.status);
    }
    if (filters?.role && filters.role !== 'ALL') {
      members = members.filter((m) => m.roles.includes(filters.role as Role));
    }
    if (filters?.search && filters.search.trim()) {
      const q = filters.search.toLowerCase().trim();
      members = members.filter(
        (m) =>
          m.full_name.toLowerCase().includes(q) ||
          m.email.toLowerCase().includes(q) ||
          (m.github_handle && m.github_handle.toLowerCase().includes(q)) ||
          m.skills.some((s) => s.toLowerCase().includes(q))
      );
    }

    return members.sort((a, b) => a.full_name.localeCompare(b.full_name));
  },

  /**
   * Get single member details by user ID
   */
  async getMemberById(
    userId: string,
    currentUserId?: string,
    userRole?: Role
  ): Promise<MemberRecord | null> {
    const isAuthorizedMember = Boolean(currentUserId);
    const isAdmin = userRole === 'ADMIN' || userRole === 'ORGANIZER' || currentUserId === userId;

    if (isInsForgeConfigured) {
      try {
        const { data: profile, error } = await insforge.database
          .from('profiles')
          .select('*, user_roles(role), member_metadata(*)')
          .eq('id', userId)
          .maybeSingle();

        if (error) throw new Error(error.message);
        if (!profile) return null;

        const roles = (profile.user_roles || []).map((r: any) => r.role as Role);
        const meta = profile.member_metadata?.[0] || {};

        return {
          id: profile.id,
          email: isAuthorizedMember ? profile.email : `${profile.email.slice(0, 3)}***@devcatalyst.club`,
          full_name: profile.full_name,
          avatar_url: profile.avatar_url,
          bio: profile.bio,
          github_handle: profile.github_handle,
          phone: isAdmin ? profile.phone : null,
          roles,
          membership_status: meta.membership_status || 'ACTIVE',
          domains: meta.domains || ['ENGINEERING'],
          skills: meta.skills || [],
          interests: meta.interests || [],
          joined_at: meta.joined_at || profile.created_at,
          department: meta.department || null,
          year_of_study: meta.year_of_study || null,
        };
      } catch (err: unknown) {
        console.warn('InsForge remote getMemberById failed:', (err as Error).message);
      }
    }

    const users = getStoredUsers();
    const user = users.find((u) => u.id === userId);
    if (!user) return null;

    const metaList = getStoredMemberMetadata();
    const meta = metaList.find((m) => m.user_id === userId) || {
      membership_status: 'ACTIVE' as MembershipStatus,
      domains: ['ENGINEERING' as ClubDomain],
      skills: [],
      interests: [],
      joined_at: user.profile?.created_at || new Date().toISOString(),
      department: null,
      year_of_study: null,
    };

    const projects: Project[] = getStoredProjects();
    const projectMembers: ProjectMember[] = getStoredMembers();
    const userProjects = projectMembers
      .filter((pm: ProjectMember) => pm.user_id === userId)
      .map((pm: ProjectMember) => {
        const prj = projects.find((p: Project) => p.id === pm.project_id);
        return {
          id: pm.project_id,
          code: prj?.code || 'PRJ',
          title: prj?.title || 'Club Project',
          project_role: pm.project_role,
        };
      });

    const attendance = getStoredAttendance();
    const attendedCount = attendance.filter((a) => a.checked_in_by === userId || a.registration_id === userId).length;

    return {
      id: user.id,
      email: isAuthorizedMember ? user.email : `${user.email.slice(0, 3)}***@devcatalyst.club`,
      full_name: user.profile?.full_name || user.name,
      avatar_url: user.profile?.avatar_url || null,
      bio: user.profile?.bio || null,
      github_handle: user.profile?.github_handle || null,
      phone: isAdmin ? (user.profile?.phone || null) : null,
      roles: user.roles || ['MEMBER'],
      membership_status: meta.membership_status,
      domains: meta.domains,
      skills: meta.skills,
      interests: meta.interests,
      joined_at: meta.joined_at,
      department: meta.department,
      year_of_study: meta.year_of_study,
      projects: userProjects,
      event_attendance_count: attendedCount,
    };
  },

  /**
   * Update member lifecycle status (Requires ADMIN or ORGANIZER)
   */
  async updateMemberStatus(
    userId: string,
    status: MembershipStatus,
    _actorId: string,
    userRole?: Role
  ): Promise<void> {
    const isAdmin = userRole === 'ADMIN' || userRole === 'ORGANIZER';
    if (!isAdmin) {
      throw new Error('Unauthorized: Only administrators can update member lifecycle status');
    }

    if (isInsForgeConfigured) {
      try {
        const { error } = await insforge.database
          .from('member_metadata')
          .update({ membership_status: status, updated_at: new Date().toISOString() })
          .eq('user_id', userId);

        if (error) throw new Error(error.message);
        return;
      } catch (err: unknown) {
        console.warn('InsForge remote updateMemberStatus failed:', (err as Error).message);
      }
    }

    const metaList = getStoredMemberMetadata();
    const index = metaList.findIndex((m) => m.user_id === userId);
    if (index !== -1) {
      metaList[index].membership_status = status;
    } else {
      metaList.push({
        id: `meta-${Date.now()}`,
        user_id: userId,
        membership_status: status,
        domains: ['ENGINEERING'],
        skills: [],
        interests: [],
        joined_at: new Date().toISOString(),
        department: null,
        year_of_study: null,
      });
    }
    saveStoredMemberMetadata(metaList);
  },

  /**
   * Update member domain tags
   */
  async updateMemberDomains(
    userId: string,
    domains: ClubDomain[],
    _actorId: string,
    userRole?: Role
  ): Promise<void> {
    const isAdmin = userRole === 'ADMIN' || userRole === 'ORGANIZER';
    if (!isAdmin) {
      throw new Error('Unauthorized: Only administrators can update member domain assignments');
    }

    const metaList = getStoredMemberMetadata();
    const index = metaList.findIndex((m) => m.user_id === userId);
    if (index !== -1) {
      metaList[index].domains = domains;
      saveStoredMemberMetadata(metaList);
    }
  },

  /**
   * Get public showcase of active club members
   * Privacy guarantee: Strips all emails, phones, attendance details, and internal notes.
   */
  async getPublicFeaturedMembers(limit = 6): Promise<{
    id: string;
    full_name: string;
    avatar_url: string | null;
    bio: string | null;
    github_handle: string | null;
    primary_role: Role;
    domains: ClubDomain[];
    skills: string[];
  }[]> {
    const allMembers = await this.getMembers({ status: 'ACTIVE' }, undefined, undefined);
    return allMembers.slice(0, limit).map((m) => ({
      id: m.id,
      full_name: m.full_name,
      avatar_url: m.avatar_url,
      bio: m.bio,
      github_handle: m.github_handle,
      primary_role: m.roles[0] || 'MEMBER',
      domains: m.domains,
      skills: m.skills.slice(0, 4),
    }));
  },
};
