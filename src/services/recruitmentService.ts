import { insforge, isInsForgeConfigured } from '../lib/insforge';
import type { Role } from '../types/auth';
import type {
  RecruitmentCycle,
  Application,
  SubmitApplicationInput,
  ApplicationStage,
  Interview,
  ScheduleInterviewInput,
  Scorecard,
  CreateScorecardInput,
  RecruitmentAuditRecord,
} from '../types/database';
import { getStoredUsers, saveStoredUsers } from './authService';
import { notificationService } from './notificationService';

const LOCAL_STORAGE_CYCLES_KEY = 'devcatalyst_hub_recruitment_cycles';
const LOCAL_STORAGE_APPLICATIONS_KEY = 'devcatalyst_hub_applications';
const LOCAL_STORAGE_INTERVIEWS_KEY = 'devcatalyst_hub_interviews';
const LOCAL_STORAGE_SCORECARDS_KEY = 'devcatalyst_hub_scorecards';
const LOCAL_STORAGE_AUDIT_KEY = 'devcatalyst_hub_recruitment_audit';

// Seed demo recruitment cycles
export const INITIAL_DEMO_CYCLES: RecruitmentCycle[] = [
  {
    id: 'cycle-001',
    title: 'Fall 2026 Core Team & Contributor Recruitment',
    term: 'Fall 2026',
    description: 'Open application drive for software engineers, product designers, and community outreach leads.',
    start_date: '2026-10-01',
    end_date: '2026-11-30',
    status: 'ACTIVE',
    created_at: '2026-09-25T10:00:00Z',
    updated_at: '2026-09-25T10:00:00Z',
    applications_count: 5,
  },
  {
    id: 'cycle-002',
    title: 'Spring 2026 Fellowship Cohort',
    term: 'Spring 2026',
    description: 'Closed inaugural mentorship and project collaboration track.',
    start_date: '2026-01-15',
    end_date: '2026-02-28',
    status: 'CLOSED',
    created_at: '2026-01-10T08:00:00Z',
    updated_at: '2026-03-01T12:00:00Z',
    applications_count: 14,
  },
];

// Seed demo applications
export const INITIAL_DEMO_APPLICATIONS: Application[] = [
  {
    id: 'app-001',
    reference_code: 'APP-2026-8A4F1',
    cycle_id: 'cycle-001',
    applicant_name: 'David Kim',
    applicant_email: 'david.kim@university.edu',
    phone: '+1 (555) 234-8901',
    institution: 'School of Computer Science, State Tech',
    domain: 'ENGINEERING',
    skills: ['TypeScript', 'React', 'Node.js', 'PostgreSQL'],
    experience_summary: '2 years building web apps and contributing to university open source projects.',
    portfolio_url: 'https://davidkim.dev',
    github_url: 'https://github.com/davidkim-dev',
    motivation: 'I want to build real-world tools that empower student creators and community tech initiatives.',
    stage: 'INTERVIEWED',
    reviewer_id: 'admin-usr-001',
    status_notes: 'Demonstrated high competency in modern React state patterns and clean database schemas.',
    submitted_at: '2026-10-05T14:20:00Z',
    updated_at: '2026-10-12T16:00:00Z',
  },
  {
    id: 'app-002',
    reference_code: 'APP-2026-3C7E9',
    cycle_id: 'cycle-001',
    applicant_name: 'Priya Sharma',
    applicant_email: 'priya.sharma@design.org',
    phone: '+1 (555) 872-3341',
    institution: 'Institute of Art & Design',
    domain: 'DESIGN',
    skills: ['Figma', 'UI/UX', 'Design Systems', 'Design Tokens', 'Tailwind'],
    experience_summary: 'Designed multi-brand mobile experiences and micro-interaction design systems.',
    portfolio_url: 'https://priyasharma.design',
    github_url: null,
    motivation: 'Passionate about crafting accessible, high-density interfaces for developer tooling.',
    stage: 'SCREENING',
    reviewer_id: 'lead-usr-002',
    status_notes: 'Strong portfolio with cohesive typographic hierarchy and dark mode treatments.',
    submitted_at: '2026-10-08T09:15:00Z',
    updated_at: '2026-10-10T11:30:00Z',
  },
  {
    id: 'app-003',
    reference_code: 'APP-2026-9B1D2',
    cycle_id: 'cycle-001',
    applicant_name: 'Mateo Hernandez',
    applicant_email: 'mateo.h@campus.edu',
    phone: '+1 (555) 678-9012',
    institution: 'Polytechnic University',
    domain: 'OUTREACH',
    skills: ['Community Organizing', 'Event Planning', 'Public Speaking', 'Sponsorship'],
    experience_summary: 'Led tech meetup chapter with 300+ attendees and managed sponsor outreach.',
    portfolio_url: null,
    github_url: null,
    motivation: 'Excited to expand DevCatalyst hackathon partnerships and student developer outreach.',
    stage: 'APPLIED',
    reviewer_id: null,
    status_notes: null,
    submitted_at: '2026-10-15T11:45:00Z',
    updated_at: '2026-10-15T11:45:00Z',
  },
  {
    id: 'app-004',
    reference_code: 'APP-2026-2F4A7',
    cycle_id: 'cycle-001',
    applicant_name: 'Aisha Al-Mansoor',
    applicant_email: 'aisha.m@techhub.io',
    phone: '+1 (555) 432-1098',
    institution: 'State Engineering College',
    domain: 'ENGINEERING',
    skills: ['Go', 'Docker', 'Distributed Systems', 'Python'],
    experience_summary: 'Built cloud pipelines and microservices for student laboratory projects.',
    portfolio_url: 'https://aisha.dev',
    github_url: 'https://github.com/aisha-tech',
    motivation: 'Eager to architect high-throughput APIs and database replication pipelines for club software.',
    stage: 'ACCEPTED',
    reviewer_id: 'admin-usr-001',
    status_notes: 'Unanimous hire recommendation across technical rubric and teamwork criteria.',
    submitted_at: '2026-10-03T10:00:00Z',
    updated_at: '2026-10-18T15:30:00Z',
  },
  {
    id: 'app-005',
    reference_code: 'APP-2026-7E8B3',
    cycle_id: 'cycle-001',
    applicant_name: 'Lucas Wright',
    applicant_email: 'lucas.w@example.com',
    phone: null,
    institution: 'City College',
    domain: 'PRODUCT',
    skills: ['User Research', 'Scrum', 'Analytics'],
    experience_summary: 'Student product lead for campus marketplace app.',
    portfolio_url: null,
    github_url: null,
    motivation: 'Looking to assist in roadmap planning and backlog grooming.',
    stage: 'REJECTED',
    reviewer_id: 'lead-usr-002',
    status_notes: 'Candidate skills do not align with current technical team priorities.',
    submitted_at: '2026-10-04T16:20:00Z',
    updated_at: '2026-10-11T14:00:00Z',
  },
];

// Seed demo interviews
export const INITIAL_DEMO_INTERVIEWS: Interview[] = [
  {
    id: 'int-001',
    application_id: 'app-001',
    scheduled_at: '2026-10-12T15:00:00Z',
    time_zone: 'UTC',
    duration_minutes: 45,
    format: 'ONLINE',
    meeting_link: 'https://meet.devcatalyst.club/interview-app-001',
    venue: null,
    interviewer_id: 'admin-usr-001',
    status: 'COMPLETED',
    created_at: '2026-10-09T10:00:00Z',
    updated_at: '2026-10-12T16:00:00Z',
  },
];

// Seed demo scorecards
export const INITIAL_DEMO_SCORECARDS: Scorecard[] = [
  {
    id: 'sc-001',
    application_id: 'app-001',
    interview_id: 'int-001',
    interviewer_id: 'admin-usr-001',
    technical_score: 5,
    collaboration_score: 4,
    communication_score: 4,
    domain_skill_score: 5,
    overall_score: 4.5,
    written_evidence: 'Demonstrated solid grasp of modern concurrency, TypeScript type-narrowing, and atomic DB operations.',
    recommendation: 'STRONG_HIRE',
    internal_notes: 'Strong candidate for upcoming Phase 6 development.',
    created_at: '2026-10-12T16:00:00Z',
    updated_at: '2026-10-12T16:00:00Z',
  },
];

export function getStoredCycles(): RecruitmentCycle[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_CYCLES_KEY);
    if (!raw) {
      localStorage.setItem(LOCAL_STORAGE_CYCLES_KEY, JSON.stringify(INITIAL_DEMO_CYCLES));
      return INITIAL_DEMO_CYCLES;
    }
    return JSON.parse(raw);
  } catch {
    return INITIAL_DEMO_CYCLES;
  }
}

export function saveStoredCycles(cycles: RecruitmentCycle[]) {
  try {
    localStorage.setItem(LOCAL_STORAGE_CYCLES_KEY, JSON.stringify(cycles));
  } catch (err) {
    console.error('Failed to save recruitment cycles to localStorage', err);
  }
}

export function getStoredApplications(): Application[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_APPLICATIONS_KEY);
    if (!raw) {
      localStorage.setItem(LOCAL_STORAGE_APPLICATIONS_KEY, JSON.stringify(INITIAL_DEMO_APPLICATIONS));
      return INITIAL_DEMO_APPLICATIONS;
    }
    return JSON.parse(raw);
  } catch {
    return INITIAL_DEMO_APPLICATIONS;
  }
}

export function saveStoredApplications(apps: Application[]) {
  try {
    localStorage.setItem(LOCAL_STORAGE_APPLICATIONS_KEY, JSON.stringify(apps));
  } catch (err) {
    console.error('Failed to save applications to localStorage', err);
  }
}

export function getStoredInterviews(): Interview[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_INTERVIEWS_KEY);
    if (!raw) {
      localStorage.setItem(LOCAL_STORAGE_INTERVIEWS_KEY, JSON.stringify(INITIAL_DEMO_INTERVIEWS));
      return INITIAL_DEMO_INTERVIEWS;
    }
    return JSON.parse(raw);
  } catch {
    return INITIAL_DEMO_INTERVIEWS;
  }
}

export function saveStoredInterviews(interviews: Interview[]) {
  try {
    localStorage.setItem(LOCAL_STORAGE_INTERVIEWS_KEY, JSON.stringify(interviews));
  } catch (err) {
    console.error('Failed to save interviews to localStorage', err);
  }
}

export function getStoredScorecards(): Scorecard[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_SCORECARDS_KEY);
    if (!raw) {
      localStorage.setItem(LOCAL_STORAGE_SCORECARDS_KEY, JSON.stringify(INITIAL_DEMO_SCORECARDS));
      return INITIAL_DEMO_SCORECARDS;
    }
    return JSON.parse(raw);
  } catch {
    return INITIAL_DEMO_SCORECARDS;
  }
}

export function saveStoredScorecards(scorecards: Scorecard[]) {
  try {
    localStorage.setItem(LOCAL_STORAGE_SCORECARDS_KEY, JSON.stringify(scorecards));
  } catch (err) {
    console.error('Failed to save scorecards to localStorage', err);
  }
}

export const INITIAL_DEMO_AUDIT_LOGS: RecruitmentAuditRecord[] = [
  {
    id: 'aud-001',
    application_id: 'app-004',
    actor_id: 'admin-usr-001',
    action: 'MEMBER_ONBOARDED',
    from_stage: 'ACCEPTED',
    to_stage: 'ACCEPTED',
    reason: 'Provisioned club member record for Aisha Al-Mansoor',
    source: 'DEMO_SEED',
    created_at: '2026-10-18T16:00:00Z',
  },
  {
    id: 'aud-002',
    application_id: 'app-004',
    actor_id: 'admin-usr-001',
    action: 'STAGE_CHANGED',
    from_stage: 'INTERVIEWED',
    to_stage: 'ACCEPTED',
    reason: 'Unanimous hire recommendation across technical rubric and teamwork criteria.',
    source: 'DEMO_SEED',
    created_at: '2026-10-18T15:30:00Z',
  },
  {
    id: 'aud-003',
    application_id: 'app-001',
    actor_id: 'admin-usr-001',
    action: 'STAGE_CHANGED',
    from_stage: 'INTERVIEW_SCHEDULED',
    to_stage: 'INTERVIEWED',
    reason: 'Demonstrated high competency in modern React state patterns and clean database schemas.',
    source: 'DEMO_SEED',
    created_at: '2026-10-12T16:00:00Z',
  },
  {
    id: 'aud-004',
    application_id: 'app-002',
    actor_id: 'lead-usr-002',
    action: 'STAGE_CHANGED',
    from_stage: 'APPLIED',
    to_stage: 'SCREENING',
    reason: 'Strong portfolio with cohesive typographic hierarchy and dark mode treatments.',
    source: 'DEMO_SEED',
    created_at: '2026-10-10T11:30:00Z',
  },
];

export function getStoredAuditLogs(): RecruitmentAuditRecord[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_AUDIT_KEY);
    if (!raw) {
      localStorage.setItem(LOCAL_STORAGE_AUDIT_KEY, JSON.stringify(INITIAL_DEMO_AUDIT_LOGS));
      return INITIAL_DEMO_AUDIT_LOGS;
    }
    return JSON.parse(raw);
  } catch {
    return INITIAL_DEMO_AUDIT_LOGS;
  }
}

export function saveStoredAuditLogs(logs: RecruitmentAuditRecord[]) {
  try {
    localStorage.setItem(LOCAL_STORAGE_AUDIT_KEY, JSON.stringify(logs));
  } catch (err) {
    console.error('Failed to save audit logs to localStorage', err);
  }
}

/**
 * Append-only immutable audit logging helper
 */
export function appendStoredAuditLog(
  record: Omit<RecruitmentAuditRecord, 'id' | 'created_at'> & { source?: 'DEMO_SEED' | 'LIVE_EVENT' }
): RecruitmentAuditRecord {
  const existing = getStoredAuditLogs();
  const newRecord: RecruitmentAuditRecord = {
    ...record,
    id: `aud-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    source: record.source || 'LIVE_EVENT',
    created_at: new Date().toISOString(),
  };
  existing.push(newRecord);
  saveStoredAuditLogs(existing);
  return newRecord;
}

function generateSafeRefCode(): string {
  const chars = '0123456789ABCDEF';
  let rand = '';
  for (let i = 0; i < 5; i++) {
    rand += chars[Math.floor(Math.random() * chars.length)];
  }
  return `APP-${new Date().getFullYear()}-${rand}`;
}

function isValidHttpUrl(str: string): boolean {
  try {
    const url = new URL(str);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

export const recruitmentService = {
  /**
   * Get Active Recruitment Cycle for public applicant portal
   */
  async getActiveCycle(): Promise<RecruitmentCycle | null> {
    if (isInsForgeConfigured) {
      try {
        const { data, error } = await insforge.database
          .from('recruitment_cycles')
          .select('*')
          .eq('status', 'ACTIVE')
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (error) throw new Error(error.message);
        return data as RecruitmentCycle | null;
      } catch (err: unknown) {
        console.warn('InsForge remote getActiveCycle failed, using local:', (err as Error).message);
      }
    }

    const cycles = getStoredCycles();
    const active = cycles.find((c) => c.status === 'ACTIVE');
    return active || null;
  },

  /**
   * Get all recruitment cycles (for reviewers)
   */
  async getCycles(): Promise<RecruitmentCycle[]> {
    if (isInsForgeConfigured) {
      try {
        const { data, error } = await insforge.database
          .from('recruitment_cycles')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) throw new Error(error.message);
        return (data || []) as RecruitmentCycle[];
      } catch (err: unknown) {
        console.warn('InsForge remote getCycles failed, using local:', (err as Error).message);
      }
    }

    const cycles = getStoredCycles();
    const apps = getStoredApplications();
    return cycles.map((c) => ({
      ...c,
      applications_count: apps.filter((a) => a.cycle_id === c.id).length,
    }));
  },

  /**
   * Submit an application (Public or authenticated)
   */
  async submitApplication(input: SubmitApplicationInput): Promise<{
    success: boolean;
    reference_code: string;
    applicant_name: string;
    domain: string;
  }> {
    // 1. Validate required fields
    if (!input.applicant_name || input.applicant_name.trim().length < 2) {
      throw new Error('Applicant full name is required');
    }

    const cleanEmail = input.applicant_email?.toLowerCase().trim();
    if (!cleanEmail || !cleanEmail.includes('@') || !cleanEmail.includes('.')) {
      throw new Error('A valid email address is required');
    }

    if (!input.institution || input.institution.trim().length < 2) {
      throw new Error('Institution or background details are required');
    }

    if (!input.experience_summary || input.experience_summary.trim().length < 10) {
      throw new Error('Please provide an experience summary (minimum 10 characters)');
    }

    if (!input.motivation || input.motivation.trim().length < 10) {
      throw new Error('Please provide a short motivation statement (minimum 10 characters)');
    }

    // 2. Validate URLs if provided
    if (input.portfolio_url && input.portfolio_url.trim()) {
      if (!isValidHttpUrl(input.portfolio_url.trim())) {
        throw new Error('Portfolio URL must be a valid HTTP or HTTPS address');
      }
    }

    if (input.github_url && input.github_url.trim()) {
      if (!isValidHttpUrl(input.github_url.trim())) {
        throw new Error('GitHub profile URL must be a valid HTTP or HTTPS address');
      }
    }

    // 3. Remote InsForge RPC submission
    if (isInsForgeConfigured) {
      try {
        const { data, error } = await insforge.database.rpc('submit_recruitment_application', {
          p_cycle_id: input.cycle_id,
          p_applicant_name: input.applicant_name.trim(),
          p_applicant_email: cleanEmail,
          p_phone: input.phone?.trim() || null,
          p_institution: input.institution.trim(),
          p_domain: input.domain,
          p_skills: input.skills,
          p_experience_summary: input.experience_summary.trim(),
          p_portfolio_url: input.portfolio_url?.trim() || null,
          p_github_url: input.github_url?.trim() || null,
          p_motivation: input.motivation.trim(),
        });

        if (error) throw new Error(error.message);
        if (data && !data.success) {
          throw new Error(data.message || 'Application submission failed');
        }
        return {
          success: true,
          reference_code: data.reference_code,
          applicant_name: data.applicant_name,
          domain: data.domain,
        };
      } catch (err: unknown) {
        console.warn('InsForge remote submit_recruitment_application failed, falling back locally:', (err as Error).message);
      }
    }

    // 4. Local verification fallback
    const cycles = getStoredCycles();
    const cycle = cycles.find((c) => c.id === input.cycle_id);
    if (!cycle) {
      throw new Error('Recruitment cycle does not exist');
    }

    if (cycle.status !== 'ACTIVE') {
      throw new Error('Recruitment applications are currently closed for this cycle');
    }

    const now = new Date();
    const start = new Date(cycle.start_date);
    const end = new Date(cycle.end_date);
    end.setHours(23, 59, 59, 999);

    if (now < start || now > end) {
      throw new Error('The application window for this recruitment cycle has closed');
    }

    // Prevent duplicate application in cycle
    const applications = getStoredApplications();
    const existing = applications.find(
      (a) => a.cycle_id === input.cycle_id && a.applicant_email.toLowerCase().trim() === cleanEmail
    );
    if (existing) {
      throw new Error('An application has already been submitted with this email for the current cycle');
    }

    const refCode = generateSafeRefCode();
    const newApp: Application = {
      id: `app-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      reference_code: refCode,
      cycle_id: input.cycle_id,
      applicant_name: input.applicant_name.trim(),
      applicant_email: cleanEmail,
      phone: input.phone?.trim() || null,
      institution: input.institution.trim(),
      domain: input.domain,
      skills: input.skills || [],
      experience_summary: input.experience_summary.trim(),
      portfolio_url: input.portfolio_url?.trim() || null,
      github_url: input.github_url?.trim() || null,
      motivation: input.motivation.trim(),
      stage: 'APPLIED',
      reviewer_id: null,
      status_notes: null,
      submitted_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      cycle,
    };

    applications.push(newApp);
    saveStoredApplications(applications);

    // Audit log
    appendStoredAuditLog({
      application_id: newApp.id,
      actor_id: null,
      action: 'APPLICATION_SUBMITTED',
      from_stage: null,
      to_stage: 'APPLIED',
      reason: 'Applicant submitted public application form',
      source: 'LIVE_EVENT',
    });

    return {
      success: true,
      reference_code: refCode,
      applicant_name: newApp.applicant_name,
      domain: newApp.domain,
    };
  },

  /**
   * Public safe reference code tracking (never exposes scorecards or private internal notes)
   */
  async getApplicationStatusByRef(referenceCode: string): Promise<{
    found: boolean;
    reference_code: string;
    applicant_name: string;
    domain: string;
    stage: ApplicationStage;
    submitted_at: string;
    cycle_title?: string;
  } | null> {
    const cleanRef = referenceCode.trim().toUpperCase();
    if (!cleanRef) return null;

    if (isInsForgeConfigured) {
      try {
        const { data, error } = await insforge.database
          .from('applications')
          .select('reference_code, applicant_name, domain, stage, submitted_at, cycle:recruitment_cycles(title)')
          .eq('reference_code', cleanRef)
          .maybeSingle();

        if (error) throw new Error(error.message);
        if (!data) return null;

        return {
          found: true,
          reference_code: data.reference_code,
          applicant_name: data.applicant_name,
          domain: data.domain,
          stage: data.stage as ApplicationStage,
          submitted_at: data.submitted_at,
          cycle_title: (data as any).cycle?.title,
        };
      } catch (err: unknown) {
        console.warn('InsForge remote getApplicationStatusByRef failed:', (err as Error).message);
      }
    }

    const apps = getStoredApplications();
    const cycles = getStoredCycles();
    const match = apps.find((a) => a.reference_code.toUpperCase() === cleanRef);
    if (!match) return null;

    const cycle = cycles.find((c) => c.id === match.cycle_id);

    return {
      found: true,
      reference_code: match.reference_code,
      applicant_name: match.applicant_name,
      domain: match.domain,
      stage: match.stage,
      submitted_at: match.submitted_at,
      cycle_title: cycle?.title,
    };
  },

  /**
   * Reviewer: Get applications with filters (Requires ADMIN, ORGANIZER, or PROJECT_LEAD)
   */
  async getApplications(
    filters?: {
      cycleId?: string;
      stage?: ApplicationStage | 'ALL';
      domain?: string | 'ALL';
      reviewerId?: string | 'ALL';
      search?: string;
    },
    userRole?: Role
  ): Promise<Application[]> {
    const isReviewer = userRole === 'ADMIN' || userRole === 'ORGANIZER' || userRole === 'PROJECT_LEAD';
    if (!isReviewer) {
      throw new Error('Unauthorized: Only recruitment reviewers can view candidate applications');
    }

    if (isInsForgeConfigured) {
      try {
        let query = insforge.database
          .from('applications')
          .select('*, cycle:recruitment_cycles(*), reviewer:profiles!reviewer_id(*), interviews(*), scorecards(*)')
          .order('submitted_at', { ascending: false });

        if (filters?.cycleId && filters.cycleId !== 'ALL') {
          query = query.eq('cycle_id', filters.cycleId);
        }
        if (filters?.stage && filters.stage !== 'ALL') {
          query = query.eq('stage', filters.stage);
        }
        if (filters?.domain && filters.domain !== 'ALL') {
          query = query.eq('domain', filters.domain);
        }
        if (filters?.reviewerId && filters.reviewerId !== 'ALL') {
          query = query.eq('reviewer_id', filters.reviewerId);
        }

        const { data, error } = await query;
        if (error) throw new Error(error.message);
        return (data || []) as Application[];
      } catch (err: unknown) {
        console.warn('InsForge remote getApplications failed, using local:', (err as Error).message);
      }
    }

    let apps = getStoredApplications();
    const cycles = getStoredCycles();
    const interviews = getStoredInterviews();
    const scorecards = getStoredScorecards();

    apps = apps.map((a) => ({
      ...a,
      cycle: cycles.find((c) => c.id === a.cycle_id),
      interviews: interviews.filter((i) => i.application_id === a.id),
      scorecards: scorecards.filter((s) => s.application_id === a.id),
    }));

    if (filters?.cycleId && filters.cycleId !== 'ALL') {
      apps = apps.filter((a) => a.cycle_id === filters.cycleId);
    }
    if (filters?.stage && filters.stage !== 'ALL') {
      apps = apps.filter((a) => a.stage === filters.stage);
    }
    if (filters?.domain && filters.domain !== 'ALL') {
      apps = apps.filter((a) => a.domain === filters.domain);
    }
    if (filters?.reviewerId && filters.reviewerId !== 'ALL') {
      apps = apps.filter((a) => a.reviewer_id === filters.reviewerId);
    }
    if (filters?.search && filters.search.trim()) {
      const q = filters.search.toLowerCase().trim();
      apps = apps.filter(
        (a) =>
          a.applicant_name.toLowerCase().includes(q) ||
          a.applicant_email.toLowerCase().includes(q) ||
          a.reference_code.toLowerCase().includes(q) ||
          a.institution.toLowerCase().includes(q)
      );
    }

    return apps.sort((a, b) => new Date(b.submitted_at).getTime() - new Date(a.submitted_at).getTime());
  },

  /**
   * Reviewer: Get single application by ID with full private notes, interviews, and scorecards
   */
  async getApplicationById(applicationId: string, userRole?: Role): Promise<Application | null> {
    const isReviewer = userRole === 'ADMIN' || userRole === 'ORGANIZER' || userRole === 'PROJECT_LEAD';
    if (!isReviewer) {
      throw new Error('Unauthorized: Only recruitment reviewers can view application details');
    }

    if (isInsForgeConfigured) {
      try {
        const { data, error } = await insforge.database
          .from('applications')
          .select('*, cycle:recruitment_cycles(*), reviewer:profiles!reviewer_id(*), interviews(*), scorecards(*)')
          .eq('id', applicationId)
          .maybeSingle();

        if (error) throw new Error(error.message);
        return data as Application | null;
      } catch (err: unknown) {
        console.warn('InsForge remote getApplicationById failed:', (err as Error).message);
      }
    }

    const apps = getStoredApplications();
    const app = apps.find((a) => a.id === applicationId);
    if (!app) return null;

    const cycles = getStoredCycles();
    const interviews = getStoredInterviews();
    const scorecards = getStoredScorecards();

    return {
      ...app,
      cycle: cycles.find((c) => c.id === app.cycle_id),
      interviews: interviews.filter((i) => i.application_id === app.id),
      scorecards: scorecards.filter((s) => s.application_id === app.id),
    };
  },

  /**
   * Reviewer: Update application stage with audit trail and valid state transitions
   */
  async updateApplicationStage(
    applicationId: string,
    newStage: ApplicationStage,
    actorId: string,
    reason?: string,
    userRole?: Role
  ): Promise<Application> {
    const isReviewer = userRole === 'ADMIN' || userRole === 'ORGANIZER' || userRole === 'PROJECT_LEAD';
    if (!isReviewer) {
      throw new Error('Unauthorized: You do not have permission to modify candidate stages');
    }

    const applications = getStoredApplications();
    const index = applications.findIndex((a) => a.id === applicationId);
    if (index === -1) {
      throw new Error('Application not found');
    }

    const current = applications[index];
    const prevStage = current.stage;

    // Validate state transitions
    if (prevStage === newStage) {
      return current;
    }

    // Prohibit moving from final REJECTED or ACCEPTED to prior stages without administrator role
    if ((prevStage === 'REJECTED' || prevStage === 'ACCEPTED') && userRole !== 'ADMIN') {
      throw new Error(`Only club administrators can re-evaluate a candidate in ${prevStage} stage`);
    }

    // Enforce decision rationale when accepting or rejecting
    if ((newStage === 'ACCEPTED' || newStage === 'REJECTED') && (!reason || !reason.trim())) {
      throw new Error('A decision rationale is required when accepting or rejecting an applicant');
    }

    if (isInsForgeConfigured) {
      try {
        const { data, error } = await insforge.database
          .from('applications')
          .update({
            stage: newStage,
            updated_at: new Date().toISOString(),
          })
          .eq('id', applicationId)
          .select('*, cycle:recruitment_cycles(*)')
          .single();

        if (error) throw new Error(error.message);

        // Record audit
        await insforge.database.from('recruitment_audit_logs').insert({
          application_id: applicationId,
          actor_id: actorId,
          action: 'STAGE_CHANGE',
          from_stage: prevStage,
          to_stage: newStage,
          reason: reason || `Stage updated from ${prevStage} to ${newStage}`,
        });

        return data as Application;
      } catch (err: unknown) {
        console.warn('InsForge remote updateApplicationStage failed, syncing locally:', (err as Error).message);
      }
    }

    const updated: Application = {
      ...current,
      stage: newStage,
      updated_at: new Date().toISOString(),
    };

    applications[index] = updated;
    saveStoredApplications(applications);

    // Local audit record
    appendStoredAuditLog({
      application_id: applicationId,
      actor_id: actorId,
      action: 'STAGE_CHANGED',
      from_stage: prevStage,
      to_stage: newStage,
      reason: reason || `Stage updated from ${prevStage} to ${newStage}`,
      source: 'LIVE_EVENT',
    });

    // Trigger candidate notification if final decision (Accepted or Rejected)
    if (newStage === 'ACCEPTED' || newStage === 'REJECTED') {
      notificationService
        .sendRecruitmentStageNotification(updated, newStage, reason)
        .catch((err) => console.warn('Failed to dispatch candidate stage decision notification:', err));
    }

    return updated;
  },

  /**
   * Reviewer: Assign reviewer to application
   */
  async assignReviewer(
    applicationId: string,
    reviewerId: string | null,
    userRole?: Role
  ): Promise<Application> {
    const isReviewer = userRole === 'ADMIN' || userRole === 'ORGANIZER' || userRole === 'PROJECT_LEAD';
    if (!isReviewer) {
      throw new Error('Unauthorized: Only reviewers can assign candidates');
    }

    const applications = getStoredApplications();
    const index = applications.findIndex((a) => a.id === applicationId);
    if (index === -1) {
      throw new Error('Application not found');
    }

    const users = getStoredUsers();
    const reviewerUser = users.find((u) => u.id === reviewerId);

    const updated: Application = {
      ...applications[index],
      reviewer_id: reviewerId,
      reviewer: reviewerUser ? reviewerUser.profile : null,
      updated_at: new Date().toISOString(),
    };

    applications[index] = updated;
    saveStoredApplications(applications);
    return updated;
  },

  /**
   * Reviewer: Save internal private reviewer notes
   */
  async updateInternalNotes(
    applicationId: string,
    notes: string,
    userRole?: Role
  ): Promise<Application> {
    const isReviewer = userRole === 'ADMIN' || userRole === 'ORGANIZER' || userRole === 'PROJECT_LEAD';
    if (!isReviewer) {
      throw new Error('Unauthorized: Only reviewers can update internal evaluation notes');
    }

    const applications = getStoredApplications();
    const index = applications.findIndex((a) => a.id === applicationId);
    if (index === -1) {
      throw new Error('Application not found');
    }

    const updated: Application = {
      ...applications[index],
      status_notes: notes.trim() || null,
      updated_at: new Date().toISOString(),
    };

    applications[index] = updated;
    saveStoredApplications(applications);
    return updated;
  },

  /**
   * Schedule candidate interview
   */
  async scheduleInterview(
    input: ScheduleInterviewInput,
    actorId: string,
    userRole?: Role
  ): Promise<Interview> {
    const isReviewer = userRole === 'ADMIN' || userRole === 'ORGANIZER' || userRole === 'PROJECT_LEAD';
    if (!isReviewer) {
      throw new Error('Unauthorized: Only reviewers can schedule candidate interviews');
    }

    if (!input.scheduled_at) {
      throw new Error('Interview scheduled date and time is required');
    }

    const schedDate = new Date(input.scheduled_at);
    if (isNaN(schedDate.getTime())) {
      throw new Error('Invalid interview date format');
    }

    if (input.format === 'ONLINE' && (!input.meeting_link || !input.meeting_link.trim())) {
      throw new Error('Meeting link is required for online interviews');
    }

    if (input.format === 'IN_PERSON' && (!input.venue || !input.venue.trim())) {
      throw new Error('Venue location is required for in-person interviews');
    }

    const newInterview: Interview = {
      id: `int-${Date.now()}`,
      application_id: input.application_id,
      scheduled_at: schedDate.toISOString(),
      time_zone: input.time_zone || 'UTC',
      duration_minutes: input.duration_minutes || 45,
      format: input.format,
      meeting_link: input.meeting_link?.trim() || null,
      venue: input.venue?.trim() || null,
      interviewer_id: input.interviewer_id || actorId,
      status: 'SCHEDULED',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const interviews = getStoredInterviews();
    interviews.push(newInterview);
    saveStoredInterviews(interviews);

    // Automatically transition application stage to INTERVIEW_SCHEDULED if currently APPLIED or SCREENING
    const applications = getStoredApplications();
    const appIndex = applications.findIndex((a) => a.id === input.application_id);
    if (appIndex !== -1) {
      const currentStage = applications[appIndex].stage;
      if (currentStage === 'APPLIED' || currentStage === 'SCREENING') {
        applications[appIndex].stage = 'INTERVIEW_SCHEDULED';
        applications[appIndex].updated_at = new Date().toISOString();
        saveStoredApplications(applications);
      }
    }

    // Audit log
    appendStoredAuditLog({
      application_id: input.application_id,
      actor_id: actorId,
      action: 'INTERVIEW_SCHEDULED',
      from_stage: 'SCREENING',
      to_stage: 'INTERVIEW_SCHEDULED',
      reason: `Interview scheduled for ${schedDate.toLocaleString()}`,
      source: 'LIVE_EVENT',
    });

    // Dispatch interview invitation notification with calendar attachment
    const targetApp = applications.find((a) => a.id === input.application_id);
    if (targetApp) {
      notificationService
        .sendInterviewScheduledNotification(newInterview, targetApp)
        .catch((err) => console.warn('Failed to dispatch interview scheduled notification:', err));
    }

    return newInterview;
  },

  /**
   * Submit structured evaluation scorecard
   */
  async submitScorecard(
    input: CreateScorecardInput,
    actorId: string,
    userRole?: Role
  ): Promise<Scorecard> {
    const isReviewer = userRole === 'ADMIN' || userRole === 'ORGANIZER' || userRole === 'PROJECT_LEAD';
    if (!isReviewer) {
      throw new Error('Unauthorized: Only reviewers can submit evaluation scorecards');
    }

    // Validate 1-5 scales
    const scores = [
      input.technical_score,
      input.collaboration_score,
      input.communication_score,
      input.domain_skill_score,
    ];

    for (const sc of scores) {
      if (sc < 1 || sc > 5 || !Number.isInteger(sc)) {
        throw new Error('All rubric criteria scores must be integers between 1 and 5');
      }
    }

    if (!input.written_evidence || input.written_evidence.trim().length < 10) {
      throw new Error('Written evidence justifying the evaluation is required (minimum 10 characters)');
    }

    const overall = parseFloat(
      (
        (input.technical_score +
          input.collaboration_score +
          input.communication_score +
          input.domain_skill_score) /
        4
      ).toFixed(1)
    );

    const newScorecard: Scorecard = {
      id: `sc-${Date.now()}`,
      application_id: input.application_id,
      interview_id: input.interview_id || null,
      interviewer_id: actorId,
      technical_score: input.technical_score,
      collaboration_score: input.collaboration_score,
      communication_score: input.communication_score,
      domain_skill_score: input.domain_skill_score,
      overall_score: overall,
      written_evidence: input.written_evidence.trim(),
      recommendation: input.recommendation,
      internal_notes: input.internal_notes?.trim() || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const scorecards = getStoredScorecards();
    scorecards.push(newScorecard);
    saveStoredScorecards(scorecards);

    // Transition application to INTERVIEWED if currently INTERVIEW_SCHEDULED
    const applications = getStoredApplications();
    const appIndex = applications.findIndex((a) => a.id === input.application_id);
    if (appIndex !== -1 && applications[appIndex].stage === 'INTERVIEW_SCHEDULED') {
      applications[appIndex].stage = 'INTERVIEWED';
      applications[appIndex].updated_at = new Date().toISOString();
      saveStoredApplications(applications);

      appendStoredAuditLog({
        application_id: input.application_id,
        actor_id: actorId,
        action: 'STAGE_CHANGED',
        from_stage: 'INTERVIEW_SCHEDULED',
        to_stage: 'INTERVIEWED',
        reason: `Evaluation scorecard submitted (Recommendation: ${input.recommendation})`,
        source: 'LIVE_EVENT',
      });
    }

    return newScorecard;
  },

  /**
   * Onboard an ACCEPTED applicant to Club Member
   * Enforces that candidate must be in ACCEPTED stage.
   * Provisions profile / member_metadata and assigns 'MEMBER' role in user_roles.
   */
  async onboardAcceptedApplicant(
    applicationId: string,
    actorId: string,
    userRole?: Role
  ): Promise<{ success: boolean; message: string; userId: string }> {
    const isAdmin = userRole === 'ADMIN' || userRole === 'ORGANIZER';
    if (!isAdmin) {
      throw new Error('Unauthorized: Only administrators can approve onboarding for accepted candidates');
    }

    const applications = getStoredApplications();
    const app = applications.find((a) => a.id === applicationId);
    if (!app) {
      throw new Error('Application not found');
    }

    if (app.stage !== 'ACCEPTED') {
      throw new Error('Candidate must be in ACCEPTED stage before onboarding to club membership');
    }

    // Check if user already exists with this email
    const users = getStoredUsers();
    let existingUser = users.find((u) => u.email.toLowerCase() === app.applicant_email.toLowerCase());

    let memberUserId: string;

    if (!existingUser) {
      // Create new user profile
      memberUserId = `usr-${Date.now()}`;
      const newUser = {
        id: memberUserId,
        email: app.applicant_email.toLowerCase(),
        password: 'password123',
        name: app.applicant_name,
        roles: ['MEMBER'] as import('../types/auth').Role[],
        profile: {
          id: memberUserId,
          email: app.applicant_email.toLowerCase(),
          full_name: app.applicant_name,
          avatar_url: null,
          bio: `${app.domain} Member. Onboarded from ${app.reference_code}.`,
          github_handle: app.github_url?.replace(/.*github\.com\//, '') || null,
          phone: app.phone,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      };
      users.push(newUser);
      saveStoredUsers(users);
    } else {
      memberUserId = existingUser.id;
      if (!existingUser.roles.includes('MEMBER')) {
        existingUser.roles.push('MEMBER');
        saveStoredUsers(users);
      }
    }

    // Provision member metadata
    const rawMetadata = localStorage.getItem('devcatalyst_hub_member_metadata');
    const metadataList: any[] = rawMetadata ? JSON.parse(rawMetadata) : [];
    const metaIndex = metadataList.findIndex((m) => m.user_id === memberUserId);

    if (metaIndex === -1) {
      metadataList.push({
        id: `meta-${Date.now()}`,
        user_id: memberUserId,
        membership_status: 'ACTIVE',
        domains: [app.domain],
        skills: app.skills,
        interests: [],
        joined_at: new Date().toISOString(),
        department: app.institution,
        year_of_study: '1st Year',
        application_id: app.id,
        updated_at: new Date().toISOString(),
      });
    } else {
      metadataList[metaIndex].membership_status = 'ACTIVE';
      if (!metadataList[metaIndex].domains.includes(app.domain)) {
        metadataList[metaIndex].domains.push(app.domain);
      }
      metadataList[metaIndex].application_id = app.id;
    }
    localStorage.setItem('devcatalyst_hub_member_metadata', JSON.stringify(metadataList));

    // Audit log
    appendStoredAuditLog({
      application_id: applicationId,
      actor_id: actorId,
      action: 'MEMBER_ONBOARDED',
      from_stage: 'ACCEPTED',
      to_stage: 'ACCEPTED',
      reason: `Provisioned club member record (${memberUserId})`,
      source: 'LIVE_EVENT',
    });

    return {
      success: true,
      message: `Successfully onboarded ${app.applicant_name} as an active club member.`,
      userId: memberUserId,
    };
  },

  /**
   * Get audit log history for an application
   */
  async getAuditLogs(applicationId: string, userRole?: Role): Promise<RecruitmentAuditRecord[]> {
    const isReviewer = userRole === 'ADMIN' || userRole === 'ORGANIZER' || userRole === 'PROJECT_LEAD';
    if (!isReviewer) {
      throw new Error('Unauthorized: Only reviewers can view candidate audit logs');
    }

    const logs = getStoredAuditLogs();
    return logs
      .filter((l) => l.application_id === applicationId)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  },

  /**
   * Get all operational audit logs across recruitment cycles (Reviewers only)
   */
  async getAllAuditLogs(userRole?: Role): Promise<RecruitmentAuditRecord[]> {
    const isReviewer = userRole === 'ADMIN' || userRole === 'ORGANIZER' || userRole === 'PROJECT_LEAD';
    if (!isReviewer) {
      return [];
    }

    const logs = getStoredAuditLogs();
    return logs.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  },
};
