import type { UserProfile } from './auth';

export type ProjectStatus = 'PLANNING' | 'ACTIVE' | 'COMPLETED' | 'ON_HOLD' | 'ARCHIVED';
export type ProjectMemberRole = 'LEAD' | 'CONTRIBUTOR' | 'VIEWER';
export type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'DONE';
export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH';

export interface Project {
  id: string;
  code: string;
  title: string;
  description: string | null;
  status: ProjectStatus;
  is_public?: boolean;
  lead_id: string | null;
  lead?: UserProfile | null;
  start_date: string | null;
  target_date: string | null;
  created_by: string;
  created_at: string;
  updated_at?: string;
  members_count?: number;
  tasks_count?: number;
}

export interface PublicProjectItem {
  id: string;
  code: string;
  title: string;
  description: string | null;
  status: ProjectStatus;
  start_date: string | null;
  target_date: string | null;
  members_count: number;
}

export interface ProjectMember {
  id: string;
  project_id: string;
  user_id: string;
  project_role: ProjectMemberRole;
  joined_at: string;
  profile?: UserProfile;
}

export interface Task {
  id: string;
  project_id: string;
  task_number: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  assignee_id: string | null;
  assignee?: UserProfile | null;
  due_date: string | null;
  position: number;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface TaskWithProject extends Task {
  project?: {
    id: string;
    code: string;
    title: string;
  };
}

export interface ProjectTaskSummary {
  total: number;
  todo: number;
  in_progress: number;
  done: number;
  completion_rate: number;
}

export interface CreateProjectInput {
  title: string;
  code?: string;
  description?: string;
  status?: ProjectStatus;
  lead_id?: string;
  start_date?: string | null;
  target_date?: string | null;
}

export interface UpdateProjectInput {
  title?: string;
  description?: string | null;
  status?: ProjectStatus;
  lead_id?: string | null;
  start_date?: string | null;
  target_date?: string | null;
}

export interface CreateTaskInput {
  project_id: string;
  title: string;
  description?: string | null;
  status?: TaskStatus;
  priority?: TaskPriority;
  assignee_id?: string | null;
  due_date?: string | null;
}

export interface UpdateTaskInput {
  title?: string;
  description?: string | null;
  status?: TaskStatus;
  priority?: TaskPriority;
  assignee_id?: string | null;
  due_date?: string | null;
  position?: number;
}

// -----------------------------------------------------------------------------
// Events, Registrations & Attendance Types (Phase 4)
// -----------------------------------------------------------------------------
export type EventType =
  | 'WORKSHOP'
  | 'HACKATHON'
  | 'TECH_TALK'
  | 'INFO_SESSION'
  | 'MEETUP'
  | 'BOOTCAMP'
  | 'OTHER';

export type EventFormat = 'IN_PERSON' | 'ONLINE' | 'HYBRID';
export type EventStatus = 'DRAFT' | 'PUBLISHED' | 'COMPLETED' | 'CANCELLED' | 'ARCHIVED';
export type RegistrationStatus = 'CONFIRMED' | 'CANCELLED' | 'ATTENDED' | 'WAITLISTED';
export type CheckInMethod = 'QR_SCAN' | 'MANUAL';

export interface EventItem {
  id: string;
  title: string;
  description: string | null;
  banner_url: string | null;
  event_type: EventType;
  format: EventFormat;
  venue: string | null;
  meeting_link: string | null;
  start_time: string;
  end_time: string;
  registration_deadline: string;
  capacity: number;
  is_public: boolean;
  status: EventStatus;
  project_id: string | null;
  project?: {
    id: string;
    code: string;
    title: string;
  } | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  // Computed fields
  registered_count?: number;
  attended_count?: number;
}

export interface CreateEventInput {
  title: string;
  description?: string | null;
  banner_url?: string | null;
  event_type?: EventType;
  format?: EventFormat;
  venue?: string | null;
  meeting_link?: string | null;
  start_time: string;
  end_time: string;
  registration_deadline: string;
  capacity: number;
  is_public?: boolean;
  status?: EventStatus;
  project_id?: string | null;
}

export interface UpdateEventInput {
  title?: string;
  description?: string | null;
  banner_url?: string | null;
  event_type?: EventType;
  format?: EventFormat;
  venue?: string | null;
  meeting_link?: string | null;
  start_time?: string;
  end_time?: string;
  registration_deadline?: string;
  capacity?: number;
  is_public?: boolean;
  status?: EventStatus;
  project_id?: string | null;
}

export interface Registration {
  id: string;
  event_id: string;
  event?: EventItem;
  user_id: string | null;
  participant_name: string;
  participant_email: string;
  participant_phone: string | null;
  institution: string | null;
  status: RegistrationStatus;
  ticket_token: string;
  ticket_code: string;
  registered_at: string;
  updated_at: string;
  attendance?: AttendanceRecord | null;
}

export interface RegisterInput {
  event_id: string;
  participant_name: string;
  participant_email: string;
  participant_phone?: string | null;
  institution?: string | null;
  user_id?: string | null;
}

export interface AttendanceRecord {
  id: string;
  event_id: string;
  registration_id: string;
  checked_in_at: string;
  checked_in_by: string | null;
  checked_in_by_profile?: UserProfile | null;
  method: CheckInMethod;
  notes: string | null;
}

export interface CheckInResult {
  success: boolean;
  code:
    | 'CHECKED_IN'
    | 'ALREADY_CHECKED_IN'
    | 'INVALID_TICKET'
    | 'WRONG_EVENT'
    | 'REGISTRATION_CANCELLED'
    | 'EVENT_NOT_ACTIVE';
  message: string;
  registration?: Registration;
  attendance?: AttendanceRecord;
}

export interface EventSummaryMetrics {
  total_events: number;
  published_events: number;
  total_registrations: number;
  total_attended: number;
}

// -----------------------------------------------------------------------------
// Phase 5: Recruitment Pipeline, Scorecards & Member CRM Types
// -----------------------------------------------------------------------------
export type RecruitmentCycleStatus = 'UPCOMING' | 'ACTIVE' | 'CLOSED' | 'ARCHIVED';

export interface RecruitmentCycle {
  id: string;
  title: string;
  term: string;
  description: string | null;
  start_date: string;
  end_date: string;
  status: RecruitmentCycleStatus;
  created_at: string;
  updated_at: string;
  applications_count?: number;
}

export type ClubDomain = 'ENGINEERING' | 'DESIGN' | 'OUTREACH' | 'PRODUCT' | 'OPERATIONS';

export type ApplicationStage =
  | 'APPLIED'
  | 'SCREENING'
  | 'INTERVIEW_SCHEDULED'
  | 'INTERVIEWED'
  | 'ACCEPTED'
  | 'REJECTED';

export interface Application {
  id: string;
  reference_code: string;
  cycle_id: string;
  applicant_name: string;
  applicant_email: string;
  phone: string | null;
  institution: string;
  domain: ClubDomain;
  skills: string[];
  experience_summary: string;
  portfolio_url: string | null;
  github_url: string | null;
  motivation: string;
  stage: ApplicationStage;
  reviewer_id: string | null;
  status_notes: string | null;
  submitted_at: string;
  updated_at: string;
  cycle?: RecruitmentCycle;
  reviewer?: UserProfile | null;
  interviews?: Interview[];
  scorecards?: Scorecard[];
}

export interface SubmitApplicationInput {
  cycle_id: string;
  applicant_name: string;
  applicant_email: string;
  phone?: string | null;
  institution: string;
  domain: ClubDomain;
  skills: string[];
  experience_summary: string;
  portfolio_url?: string | null;
  github_url?: string | null;
  motivation: string;
}

export type InterviewFormat = 'ONLINE' | 'IN_PERSON';
export type InterviewStatus = 'SCHEDULED' | 'COMPLETED' | 'RESCHEDULED' | 'CANCELLED';

export interface Interview {
  id: string;
  application_id: string;
  scheduled_at: string;
  time_zone: string;
  duration_minutes: number;
  format: InterviewFormat;
  meeting_link: string | null;
  venue: string | null;
  interviewer_id: string | null;
  interviewer?: UserProfile | null;
  status: InterviewStatus;
  created_at: string;
  updated_at: string;
}

export interface ScheduleInterviewInput {
  application_id: string;
  scheduled_at: string;
  time_zone?: string;
  duration_minutes?: number;
  format: InterviewFormat;
  meeting_link?: string | null;
  venue?: string | null;
  interviewer_id?: string | null;
}

export type ScoreRecommendation = 'STRONG_HIRE' | 'HIRE' | 'NEUTRAL' | 'DO_NOT_HIRE';

export interface Scorecard {
  id: string;
  application_id: string;
  interview_id: string | null;
  interviewer_id: string;
  interviewer?: UserProfile | null;
  technical_score: number;
  collaboration_score: number;
  communication_score: number;
  domain_skill_score: number;
  overall_score: number;
  written_evidence: string;
  recommendation: ScoreRecommendation;
  internal_notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateScorecardInput {
  application_id: string;
  interview_id?: string | null;
  interviewer_id: string;
  technical_score: number;
  collaboration_score: number;
  communication_score: number;
  domain_skill_score: number;
  written_evidence: string;
  recommendation: ScoreRecommendation;
  internal_notes?: string | null;
}

export interface RecruitmentAuditRecord {
  id: string;
  application_id: string;
  actor_id: string | null;
  actor?: UserProfile | null;
  action: string;
  from_stage: ApplicationStage | null;
  to_stage: ApplicationStage;
  reason: string | null;
  source?: 'DEMO_SEED' | 'LIVE_EVENT';
  created_at: string;
}

export type MembershipStatus = 'ACTIVE' | 'ALUMNI' | 'INACTIVE' | 'PROBATION';

export interface MemberRecord {
  id: string;
  email: string;
  full_name: string;
  avatar_url: string | null;
  bio: string | null;
  github_handle: string | null;
  phone: string | null;
  roles: import('./auth').Role[];
  membership_status: MembershipStatus;
  domains: ClubDomain[];
  skills: string[];
  interests: string[];
  joined_at: string;
  department: string | null;
  year_of_study: string | null;
  projects?: {
    id: string;
    code: string;
    title: string;
    project_role: ProjectMemberRole;
  }[];
  event_attendance_count?: number;
  registered_events_count?: number;
}

