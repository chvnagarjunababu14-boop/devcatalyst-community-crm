import { projectService } from './projectService';
import { taskService } from './taskService';
import { eventService } from './eventService';
import { registrationService } from './registrationService';
import { recruitmentService } from './recruitmentService';
import { memberService } from './memberService';
import type { Role } from '../types/auth';

export interface ProjectAnalytics {
  total: number;
  active: number;
  planning: number;
  completed: number;
  onHold: number;
  overallCompletionRate: number;
}

export interface TaskAnalytics {
  total: number;
  todo: number;
  inProgress: number;
  done: number;
  highPriority: number;
  mediumPriority: number;
  lowPriority: number;
  completionRate: number;
}

export interface EventAnalytics {
  total: number;
  published: number;
  draft: number;
  completed: number;
  totalCapacity: number;
  totalRegistrations: number;
  totalAttended: number;
  capacityUtilizationRate: number;
  attendanceConversionRate: number;
}

export interface RecruitmentAnalytics {
  total: number;
  applied: number;
  screening: number;
  interviewScheduled: number;
  interviewed: number;
  accepted: number;
  rejected: number;
  acceptanceRate: number;
  interviewConversionRate: number;
}

export interface MemberAnalytics {
  total: number;
  active: number;
  alumni: number;
  inactive: number;
  probation: number;
  domainCounts: Record<string, number>;
}

export interface AnalyticsDateFilter {
  startDate?: string;
  endDate?: string;
}

export interface ClubAnalyticsSummary {
  generatedAt: string;
  dateFilter?: AnalyticsDateFilter;
  projects: ProjectAnalytics;
  tasks: TaskAnalytics;
  events: EventAnalytics;
  recruitment: RecruitmentAnalytics;
  members: MemberAnalytics;
}

export const analyticsService = {
  /**
   * Aggregate cross-module metrics across all club subsystems with date boundary support
   */
  async getClubAnalyticsSummary(
    userId?: string,
    userRole?: Role,
    dateFilter?: AnalyticsDateFilter
  ): Promise<ClubAnalyticsSummary> {
    if (userRole === 'PARTICIPANT') {
      throw new Error('Unauthorized: Participants cannot access internal club analytics');
    }

    if (dateFilter?.startDate && dateFilter?.endDate) {
      const start = new Date(dateFilter.startDate);
      const end = new Date(dateFilter.endDate);
      if (start > end) {
        throw new Error('Invalid date boundary: Start date cannot be after end date');
      }
    }

    // 1. Fetch raw datasets concurrently
    let [
      projects,
      events,
      registrations,
      applications,
      members,
    ] = await Promise.all([
      projectService.getProjects(userId, userRole).catch(() => []),
      eventService.getEvents(undefined, userId, userRole).catch(() => []),
      registrationService.getRegistrations({}, userId, userRole).catch(() => []),
      recruitmentService.getApplications({}, userRole).catch(() => []),
      memberService.getMembers(undefined, userId, userRole).catch(() => []),
    ]);

    // Apply date boundaries if provided
    if (dateFilter?.startDate || dateFilter?.endDate) {
      const startMs = dateFilter.startDate ? new Date(dateFilter.startDate).getTime() : -Infinity;
      const endMs = dateFilter.endDate ? new Date(dateFilter.endDate).getTime() : Infinity;

      events = events.filter((e) => {
        const time = new Date(e.start_time).getTime();
        return time >= startMs && time <= endMs;
      });

      applications = applications.filter((a) => {
        const time = new Date(a.submitted_at).getTime();
        return time >= startMs && time <= endMs;
      });

      projects = projects.filter((p) => {
        const time = new Date(p.created_at || (p as any).updated_at || Date.now()).getTime();
        return time >= startMs && time <= endMs;
      });

      registrations = registrations.filter((r) => {
        const time = new Date(r.registered_at).getTime();
        return time >= startMs && time <= endMs;
      });
    }

    // 2. Aggregate tasks across all loaded projects
    let allTasks: any[] = [];
    if (projects.length > 0) {
      const taskResults = await Promise.all(
        projects.map((p) => taskService.getProjectTasks(p.id).catch(() => []))
      );
      allTasks = taskResults.flat();
    }

    if (dateFilter?.startDate || dateFilter?.endDate) {
      const startMs = dateFilter.startDate ? new Date(dateFilter.startDate).getTime() : -Infinity;
      const endMs = dateFilter.endDate ? new Date(dateFilter.endDate).getTime() : Infinity;

      allTasks = allTasks.filter((t) => {
        const time = new Date(t.created_at || (t as { updated_at?: string }).updated_at || Date.now()).getTime();
        return time >= startMs && time <= endMs;
      });
    }

    // 3. Calculate Project Analytics
    const projectActive = projects.filter((p) => p.status === 'ACTIVE').length;
    const projectPlanning = projects.filter((p) => p.status === 'PLANNING').length;
    const projectCompleted = projects.filter((p) => p.status === 'COMPLETED').length;
    const projectOnHold = projects.filter((p) => p.status === 'ON_HOLD' || p.status === 'ARCHIVED').length;

    // 4. Calculate Task Analytics
    const taskTodo = allTasks.filter((t) => t.status === 'TODO').length;
    const taskInProgress = allTasks.filter((t) => t.status === 'IN_PROGRESS').length;
    const taskDone = allTasks.filter((t) => t.status === 'DONE').length;
    const taskHigh = allTasks.filter((t) => t.priority === 'HIGH').length;
    const taskMed = allTasks.filter((t) => t.priority === 'MEDIUM').length;
    const taskLow = allTasks.filter((t) => t.priority === 'LOW').length;
    const taskCompletionRate = allTasks.length > 0
      ? Math.round((taskDone / allTasks.length) * 100)
      : 0;

    // Project overall completion rate derived from tasks
    const overallProjectCompletion = taskCompletionRate;

    // 5. Calculate Event & Attendance Analytics
    const eventPublished = events.filter((e) => e.status === 'PUBLISHED').length;
    const eventDraft = events.filter((e) => e.status === 'DRAFT').length;
    const eventCompleted = events.filter((e) => e.status === 'COMPLETED').length;
    const totalCapacity = events.reduce((sum, e) => sum + (e.capacity || 0), 0);
    const totalRegistrations = registrations.filter((r) => r.status !== 'CANCELLED').length;
    const totalAttended = registrations.filter((r) => r.status === 'ATTENDED').length;

    const capacityUtilizationRate = totalCapacity > 0
      ? Math.min(100, Math.round((totalRegistrations / totalCapacity) * 100))
      : 0;
    const attendanceConversionRate = totalRegistrations > 0
      ? Math.round((totalAttended / totalRegistrations) * 100)
      : 0;

    // 6. Calculate Recruitment Analytics
    const appApplied = applications.filter((a) => a.stage === 'APPLIED').length;
    const appScreening = applications.filter((a) => a.stage === 'SCREENING').length;
    const appInterviewSched = applications.filter((a) => a.stage === 'INTERVIEW_SCHEDULED').length;
    const appInterviewed = applications.filter((a) => a.stage === 'INTERVIEWED').length;
    const appAccepted = applications.filter((a) => a.stage === 'ACCEPTED').length;
    const appRejected = applications.filter((a) => a.stage === 'REJECTED').length;

    const acceptanceRate = applications.length > 0
      ? Math.round((appAccepted / applications.length) * 100)
      : 0;
    const interviewCount = appInterviewSched + appInterviewed;
    const interviewConversionRate = applications.length > 0
      ? Math.round(((interviewCount + appAccepted) / applications.length) * 100)
      : 0;

    // 7. Calculate Member Analytics
    const memberActive = members.filter((m) => m.membership_status === 'ACTIVE').length;
    const memberAlumni = members.filter((m) => m.membership_status === 'ALUMNI').length;
    const memberInactive = members.filter((m) => m.membership_status === 'INACTIVE').length;
    const memberProbation = members.filter((m) => m.membership_status === 'PROBATION').length;

    const domainCounts: Record<string, number> = {
      ENGINEERING: 0,
      DESIGN: 0,
      PRODUCT: 0,
      OUTREACH: 0,
      OPERATIONS: 0,
    };

    members.forEach((m) => {
      if (Array.isArray(m.domains)) {
        m.domains.forEach((d) => {
          if (domainCounts[d] !== undefined) {
            domainCounts[d]++;
          }
        });
      }
    });

    return {
      generatedAt: new Date().toISOString(),
      dateFilter,
      projects: {
        total: projects.length,
        active: projectActive,
        planning: projectPlanning,
        completed: projectCompleted,
        onHold: projectOnHold,
        overallCompletionRate: overallProjectCompletion,
      },
      tasks: {
        total: allTasks.length,
        todo: taskTodo,
        inProgress: taskInProgress,
        done: taskDone,
        highPriority: taskHigh,
        mediumPriority: taskMed,
        lowPriority: taskLow,
        completionRate: taskCompletionRate,
      },
      events: {
        total: events.length,
        published: eventPublished,
        draft: eventDraft,
        completed: eventCompleted,
        totalCapacity,
        totalRegistrations,
        totalAttended,
        capacityUtilizationRate,
        attendanceConversionRate,
      },
      recruitment: {
        total: applications.length,
        applied: appApplied,
        screening: appScreening,
        interviewScheduled: appInterviewSched,
        interviewed: appInterviewed,
        accepted: appAccepted,
        rejected: appRejected,
        acceptanceRate,
        interviewConversionRate,
      },
      members: {
        total: members.length,
        active: memberActive,
        alumni: memberAlumni,
        inactive: memberInactive,
        probation: memberProbation,
        domainCounts,
      },
    };
  },

  /**
   * Export comprehensive club analytics summary as downloadable CSV (RFC 4180 compliant)
   */
  exportAnalyticsReportCsv(summary: ClubAnalyticsSummary, timeframeLabel = 'All Time'): void {
    const filterInfo = summary.dateFilter?.startDate || summary.dateFilter?.endDate
      ? `Custom (${summary.dateFilter.startDate || 'Start'} to ${summary.dateFilter.endDate || 'Present'})`
      : timeframeLabel;

    const rows: string[][] = [
      ['DevCatalyst Hub — Club Operations & Analytics Intelligence Report'],
      [`Generated at: ${new Date(summary.generatedAt).toLocaleString()}`],
      [`Timeframe Filter: ${filterInfo}`],
      ['Confidentiality: Internal Aggregated Metrics Only (Zero Personal Data / PII)'],
      [''],
      ['SECTION: PROJECTS & WORKLOAD'],
      ['Metric', 'Value'],
      ['Total Initiatives', summary.projects.total.toString()],
      ['Active Initiatives', summary.projects.active.toString()],
      ['Planning Initiatives', summary.projects.planning.toString()],
      ['Completed Initiatives', summary.projects.completed.toString()],
      ['On Hold / Archived', summary.projects.onHold.toString()],
      ['Overall Task Completion Rate', `${summary.projects.overallCompletionRate}%`],
      [''],
      ['SECTION: TASK MANAGEMENT & KANBAN'],
      ['Metric', 'Value'],
      ['Total Tracked Tasks', summary.tasks.total.toString()],
      ['Tasks in TODO', summary.tasks.todo.toString()],
      ['Tasks in PROGRESS', summary.tasks.inProgress.toString()],
      ['Tasks DONE', summary.tasks.done.toString()],
      ['High Priority Tasks', summary.tasks.highPriority.toString()],
      ['Medium Priority Tasks', summary.tasks.mediumPriority.toString()],
      ['Low Priority Tasks', summary.tasks.lowPriority.toString()],
      ['Task Completion Rate', `${summary.tasks.completionRate}%`],
      [''],
      ['SECTION: EVENTS & ATTENDANCE'],
      ['Metric', 'Value'],
      ['Total Events Scheduled', summary.events.total.toString()],
      ['Published Events', summary.events.published.toString()],
      ['Draft Events', summary.events.draft.toString()],
      ['Completed Events', summary.events.completed.toString()],
      ['Total Seat Capacity', summary.events.totalCapacity.toString()],
      ['Active Registrations', summary.events.totalRegistrations.toString()],
      ['Confirmed Attendees', summary.events.totalAttended.toString()],
      ['Capacity Utilization Rate', `${summary.events.capacityUtilizationRate}%`],
      ['Attendance Conversion Rate', `${summary.events.attendanceConversionRate}%`],
      [''],
      ['SECTION: RECRUITMENT PIPELINE FUNNEL'],
      ['Stage', 'Candidate Count'],
      ['Applied (Initial Ingestion)', summary.recruitment.applied.toString()],
      ['Screening (Resume & Portfolio)', summary.recruitment.screening.toString()],
      ['Interview Scheduled', summary.recruitment.interviewScheduled.toString()],
      ['Interviewed (Evaluated)', summary.recruitment.interviewed.toString()],
      ['Accepted (Offered Membership)', summary.recruitment.accepted.toString()],
      ['Rejected / Archived', summary.recruitment.rejected.toString()],
      ['Overall Acceptance Rate', `${summary.recruitment.acceptanceRate}%`],
      ['Interview Conversion Rate', `${summary.recruitment.interviewConversionRate}%`],
      [''],
      ['SECTION: MEMBER DIRECTORY & DOMAIN BREAKDOWN'],
      ['Domain / Segment', 'Members Count'],
      ['Active Members', summary.members.active.toString()],
      ['Alumni', summary.members.alumni.toString()],
      ['Inactive', summary.members.inactive.toString()],
      ['Engineering Domain', (summary.members.domainCounts.ENGINEERING || 0).toString()],
      ['Design Domain', (summary.members.domainCounts.DESIGN || 0).toString()],
      ['Product Domain', (summary.members.domainCounts.PRODUCT || 0).toString()],
      ['Outreach Domain', (summary.members.domainCounts.OUTREACH || 0).toString()],
      ['Operations Domain', (summary.members.domainCounts.OPERATIONS || 0).toString()],
    ];

    // RFC 4180 Escaping: Escape quotes with double-quotes, remove line breaks within cell
    const csvString = rows
      .map((row) =>
        row
          .map((cell) => `"${String(cell).replace(/[\r\n]+/g, ' ').replace(/"/g, '""')}"`)
          .join(',')
      )
      .join('\r\n');

    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute(
      'download',
      `devcatalyst-club-analytics-${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  },
};
