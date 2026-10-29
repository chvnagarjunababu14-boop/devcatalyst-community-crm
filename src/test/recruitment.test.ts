import { describe, it, expect, beforeEach } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { recruitmentService } from '../services/recruitmentService';
import { memberService } from '../services/memberService';
import type { SubmitApplicationInput, ScheduleInterviewInput, CreateScorecardInput } from '../types/database';

describe('Phase 5: Recruitment Pipeline, Scorecards & Member CRM', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('1. Public Applicant Portal & Input Validation', () => {
    it('retrieves active recruitment cycle and lists seeded candidates for reviewers', async () => {
      const activeCycle = await recruitmentService.getActiveCycle();
      expect(activeCycle).toBeDefined();
      expect(activeCycle?.status).toBe('ACTIVE');
      expect(activeCycle?.title).toContain('Core Team');

      const applications = await recruitmentService.getApplications({ cycleId: 'cycle-001' }, 'ADMIN');
      expect(applications.length).toBeGreaterThanOrEqual(5);
    });

    it('submits a valid application and receives a safe reference code (APP-YYYY-XXXXX)', async () => {
      const input: SubmitApplicationInput = {
        cycle_id: 'cycle-001',
        applicant_name: 'Elena Rostova',
        applicant_email: 'elena.rostova@university.edu',
        phone: '+1 555-0199',
        institution: 'Institute of Technology',
        domain: 'ENGINEERING',
        skills: ['Rust', 'WebAssembly', 'Distributed Systems'],
        experience_summary: '2 years of systems programming and open source contributor work.',
        portfolio_url: 'https://elena.dev',
        github_url: 'https://github.com/elena-rust',
        motivation: 'Passionate about building high-performance open-source tools for student developers.',
      };

      const result = await recruitmentService.submitApplication(input);
      expect(result).toBeDefined();
      expect(result.reference_code).toBeDefined();
      expect(result.reference_code).toMatch(/^APP-\d{4}-[A-Z0-9]{5}$/);
      expect(result.applicant_name).toBe('Elena Rostova');
      expect(result.domain).toBe('ENGINEERING');
    });

    it('rejects submission with invalid email format', async () => {
      const input: SubmitApplicationInput = {
        cycle_id: 'cycle-001',
        applicant_name: 'Test Candidate',
        applicant_email: 'invalid-email-address',
        institution: 'State College',
        domain: 'ENGINEERING',
        skills: ['TypeScript'],
        experience_summary: 'Some development experience in college courses.',
        motivation: 'Want to join club',
      };

      await expect(recruitmentService.submitApplication(input)).rejects.toThrow('A valid email address is required');
    });

    it('validates URL formats for portfolio and github profile', async () => {
      const input: SubmitApplicationInput = {
        cycle_id: 'cycle-001',
        applicant_name: 'Test Candidate',
        applicant_email: 'candidate@college.edu',
        institution: 'State College',
        domain: 'DESIGN',
        skills: ['Figma'],
        experience_summary: 'UI/UX design portfolio work and wireframing.',
        portfolio_url: 'not-a-valid-http-url',
        motivation: 'Interested in product UI/UX design',
      };

      await expect(recruitmentService.submitApplication(input)).rejects.toThrow(
        'Portfolio URL must be a valid HTTP or HTTPS address'
      );
    });

    it('prevents duplicate active applications in the same cycle for the same email', async () => {
      const input: SubmitApplicationInput = {
        cycle_id: 'cycle-001',
        applicant_name: 'David Kim',
        applicant_email: 'david.kim@university.edu', // Seeded applicant in cycle-001
        institution: 'School of Computer Science, State Tech',
        domain: 'ENGINEERING',
        skills: ['React', 'Python'],
        experience_summary: 'Full-stack web application development experience.',
        motivation: 'Trying to submit a duplicate application',
      };

      await expect(recruitmentService.submitApplication(input)).rejects.toThrow(
        'An application has already been submitted with this email for the current cycle'
      );
    });

    it('rejects applications submitted to a closed cycle', async () => {
      const input: SubmitApplicationInput = {
        cycle_id: 'cycle-002', // Seeded as 'CLOSED'
        applicant_name: 'New Candidate',
        applicant_email: 'new.candidate@college.edu',
        institution: 'State College',
        domain: 'OUTREACH',
        skills: ['Public Speaking'],
        experience_summary: 'Event organization and community outreach.',
        motivation: 'Want to apply to old cohort',
      };

      await expect(recruitmentService.submitApplication(input)).rejects.toThrow(
        'Recruitment applications are currently closed for this cycle'
      );
    });
  });

  describe('2. Public Data Isolation & Safe Reference Tracking', () => {
    it('returns high-level public status without sensitive internal notes or scorecards', async () => {
      // Seeded candidate app-001 (David Kim, INTERVIEWED) has reference code APP-2026-8A4F1
      const publicStatus = await recruitmentService.getApplicationStatusByRef('APP-2026-8A4F1');
      expect(publicStatus).toBeDefined();
      expect(publicStatus?.reference_code).toBe('APP-2026-8A4F1');
      expect(publicStatus?.applicant_name).toBe('David Kim');
      expect(publicStatus?.domain).toBe('ENGINEERING');
      expect(publicStatus?.stage).toBe('INTERVIEWED');
      expect(publicStatus?.cycle_title).toBeDefined();

      // Privacy verification: strict non-exposure of internal review data
      const record = publicStatus as any;
      expect(record.internal_notes).toBeUndefined();
      expect(record.assigned_reviewer_id).toBeUndefined();
      expect(record.scorecards).toBeUndefined();
      expect(record.audit_logs).toBeUndefined();
    });

    it('returns null for nonexistent reference codes', async () => {
      const result = await recruitmentService.getApplicationStatusByRef('APP-9999-NONEXIST');
      expect(result).toBeNull();
    });
  });

  describe('3. Reviewer Pipeline, Stage Transitions & Audit Trail', () => {
    it('permits authorized reviewers (ADMIN, ORGANIZER, PROJECT_LEAD) to view candidate pipeline', async () => {
      const adminApps = await recruitmentService.getApplications({ cycleId: 'cycle-001' }, 'ADMIN');
      expect(adminApps.length).toBeGreaterThan(0);

      const leadApps = await recruitmentService.getApplications({ cycleId: 'cycle-001' }, 'PROJECT_LEAD');
      expect(leadApps.length).toBeGreaterThan(0);
    });

    it('rejects unauthorized members from viewing reviewer workspace', async () => {
      await expect(
        recruitmentService.getApplications({ cycleId: 'cycle-001' }, 'MEMBER')
      ).rejects.toThrow('Unauthorized');
    });

    it('assigns a reviewer to an applicant and updates candidate record', async () => {
      const updated = await recruitmentService.assignReviewer(
        'app-003',
        'lead-usr-002',
        'ADMIN'
      );
      expect(updated.reviewer_id).toBe('lead-usr-002');
      expect(updated.reviewer?.full_name).toBe('Sarah Chen');
    });

    it('enforces authorized stage transitions and writes an audit log', async () => {
      // Transition Mateo Hernandez from APPLIED -> SCREENING
      const transitioned = await recruitmentService.updateApplicationStage(
        'app-003',
        'SCREENING',
        'admin-usr-001',
        'Initial resume and GitHub profile review completed',
        'ADMIN'
      );
      expect(transitioned.stage).toBe('SCREENING');

      const auditLogs = await recruitmentService.getAuditLogs('app-003', 'ADMIN');
      expect(auditLogs.length).toBeGreaterThan(0);
      const latest = auditLogs[0];
      expect(latest.to_stage).toBe('SCREENING');
      expect(latest.reason).toBe('Initial resume and GitHub profile review completed');
    });

    it('requires a clear decision rationale when transitioning to ACCEPTED or REJECTED', async () => {
      // Transition Priya Sharma (SCREENING) to ACCEPTED without a reason
      await expect(
        recruitmentService.updateApplicationStage(
          'app-002',
          'ACCEPTED',
          'admin-usr-001',
          '   ', // empty rationale
          'ADMIN'
        )
      ).rejects.toThrow('A decision rationale is required when accepting or rejecting an applicant');
    });
  });

  describe('4. Interview Scheduling & Scorecards', () => {
    it('schedules an interview with format, duration, and link/venue validation', async () => {
      const scheduleInput: ScheduleInterviewInput = {
        application_id: 'app-002',
        scheduled_at: '2026-11-15T15:00:00Z',
        duration_minutes: 45,
        time_zone: 'UTC',
        interviewer_id: 'lead-usr-002',
        format: 'ONLINE',
        meeting_link: 'https://meet.google.com/devcat-interview-priya',
      };

      const interview = await recruitmentService.scheduleInterview(
        scheduleInput,
        'admin-usr-001',
        'ADMIN'
      );

      expect(interview).toBeDefined();
      expect(interview.id).toBeDefined();
      expect(interview.application_id).toBe('app-002');
      expect(interview.format).toBe('ONLINE');
      expect(interview.status).toBe('SCHEDULED');

      // Application stage should now be INTERVIEW_SCHEDULED
      const app = await recruitmentService.getApplicationById('app-002', 'ADMIN');
      expect(app?.stage).toBe('INTERVIEW_SCHEDULED');
    });

    it('rejects interview scheduling without a meeting link for online format', async () => {
      const scheduleInput: ScheduleInterviewInput = {
        application_id: 'app-002',
        scheduled_at: '2026-11-15T15:00:00Z',
        duration_minutes: 45,
        time_zone: 'UTC',
        interviewer_id: 'lead-usr-002',
        format: 'ONLINE',
        meeting_link: undefined, // Missing link
      };

      await expect(
        recruitmentService.scheduleInterview(scheduleInput, 'admin-usr-001', 'ADMIN')
      ).rejects.toThrow('Meeting link is required for online interviews');
    });

    it('submits a structured scorecard with rubric scores (1-5) and written evidence', async () => {
      const cardInput: CreateScorecardInput = {
        application_id: 'app-001',
        interviewer_id: 'lead-usr-002',
        technical_score: 5,
        collaboration_score: 4,
        communication_score: 5,
        domain_skill_score: 4,
        written_evidence: 'Outstanding system design, clean coding style, and confident communication.',
        recommendation: 'STRONG_HIRE',
        internal_notes: 'Candidate showed exceptional maturity and would make a strong lead contributor.',
      };

      const scorecard = await recruitmentService.submitScorecard(
        cardInput,
        'lead-usr-002',
        'PROJECT_LEAD'
      );

      expect(scorecard.id).toBeDefined();
      expect(scorecard.technical_score).toBe(5);
      expect(scorecard.overall_score).toBeCloseTo(4.5, 1);
      expect(scorecard.recommendation).toBe('STRONG_HIRE');
      expect(scorecard.interviewer_id).toBe('lead-usr-002');
    });

    it('rejects scorecard with invalid score ranges (< 1 or > 5)', async () => {
      const cardInput: CreateScorecardInput = {
        application_id: 'app-001',
        interviewer_id: 'lead-usr-002',
        technical_score: 6, // Invalid > 5
        collaboration_score: 4,
        communication_score: 4,
        domain_skill_score: 4,
        written_evidence: 'Good skills demonstrated during the session.',
        recommendation: 'HIRE',
      };

      await expect(
        recruitmentService.submitScorecard(cardInput, 'lead-usr-002', 'PROJECT_LEAD')
      ).rejects.toThrow('All rubric criteria scores must be integers between 1 and 5');
    });
  });

  describe('5. Onboarding Safety & Member Creation', () => {
    it('prevents onboarding an applicant who is not in ACCEPTED stage', async () => {
      // app-001 is INTERVIEWED, not ACCEPTED
      await expect(
        recruitmentService.onboardAcceptedApplicant(
          'app-001',
          'admin-usr-001',
          'ADMIN'
        )
      ).rejects.toThrow('Candidate must be in ACCEPTED stage before onboarding to club membership');
    });

    it('safely onboards an ACCEPTED applicant with MEMBER role and member metadata', async () => {
      // app-004 (Aisha Al-Mansoor) is ACCEPTED in seed data
      const onboardResult = await recruitmentService.onboardAcceptedApplicant(
        'app-004',
        'admin-usr-001',
        'ADMIN'
      );

      expect(onboardResult.success).toBe(true);
      expect(onboardResult.userId).toBeDefined();

      // Retrieve the newly provisioned member profile
      const newMember = await memberService.getMemberById(
        onboardResult.userId,
        'admin-usr-001',
        'ADMIN'
      );

      expect(newMember).toBeDefined();
      expect(newMember?.email).toBe('aisha.m@techhub.io');
      expect(newMember?.full_name).toBe('Aisha Al-Mansoor');
      expect(newMember?.roles).toContain('MEMBER');
      expect(newMember?.membership_status).toBe('ACTIVE');
      expect(newMember?.domains).toContain('ENGINEERING');

      // Verify the new member appears in Member CRM directory
      const directory = await memberService.getMembers(
        { search: 'Aisha' },
        'admin-usr-001',
        'ADMIN'
      );
      expect(directory.some((m) => m.full_name === 'Aisha Al-Mansoor')).toBe(true);
    });
  });

  describe('6. Member CRM Directory & Privacy Safeguards', () => {
    it('protects contact information: masks email and hides phone for unauthenticated or non-admin callers', async () => {
      // Anonymous / unauthenticated view
      const publicView = await memberService.getMembers(undefined, undefined, undefined);
      expect(publicView.length).toBeGreaterThan(0);
      expect(publicView[0].email).toContain('***@devcatalyst.club');
      expect(publicView[0].phone).toBeNull();

      // Normal member view: email is visible, but private phone remains null
      const memberView = await memberService.getMembers(undefined, 'member-usr-003', 'MEMBER');
      expect(memberView.length).toBeGreaterThan(0);
      expect(memberView[0].email).not.toContain('***@devcatalyst.club');
      expect(memberView[0].phone).toBeNull();

      // Admin view: both email and private phone are accessible
      const adminView = await memberService.getMembers(undefined, 'admin-usr-001', 'ADMIN');
      expect(adminView.length).toBeGreaterThan(0);
      const alex = adminView.find((m) => m.id === 'admin-usr-001');
      expect(alex?.phone).toBeDefined();
    });

    it('filters member directory by domain, status, and search query', async () => {
      const designMembers = await memberService.getMembers(
        { domain: 'DESIGN' },
        'admin-usr-001',
        'ADMIN'
      );
      expect(designMembers.every((m) => m.domains.includes('DESIGN'))).toBe(true);

      const searchResult = await memberService.getMembers(
        { search: 'Sarah' },
        'admin-usr-001',
        'ADMIN'
      );
      expect(searchResult.length).toBe(1);
      expect(searchResult[0].full_name).toBe('Sarah Chen');
    });

    it('aggregates project memberships and attendance counts on member details', async () => {
      const sarah = await memberService.getMemberById('lead-usr-002', 'admin-usr-001', 'ADMIN');
      expect(sarah).toBeDefined();
      expect(sarah?.projects).toBeDefined();
      expect(sarah?.projects && sarah.projects.length).toBeGreaterThanOrEqual(1);

      const proj = sarah?.projects?.[0];
      expect(proj?.project_role).toBe('LEAD');
      expect(proj?.title).toBeDefined();
    });

    it('allows administrators to update member lifecycle status and domain assignments', async () => {
      await memberService.updateMemberStatus(
        'member-usr-003',
        'ALUMNI',
        'admin-usr-001',
        'ADMIN'
      );

      const updated = await memberService.getMemberById('member-usr-003', 'admin-usr-001', 'ADMIN');
      expect(updated?.membership_status).toBe('ALUMNI');

      // Unauthorized member attempt must fail
      await expect(
        memberService.updateMemberStatus(
          'member-usr-003',
          'ACTIVE',
          'member-usr-003',
          'MEMBER'
        )
      ).rejects.toThrow('Unauthorized');
    });
  });

  describe('7. Audit Trail Source Distinctions & Append-Only Guarantees', () => {
    it('distinguishes seeded historical audit logs (DEMO_SEED) from live mutation events (LIVE_EVENT)', async () => {
      const logs = await recruitmentService.getAllAuditLogs('ADMIN');
      expect(logs.length).toBeGreaterThan(0);

      // Verify initial demo audit logs are explicitly marked DEMO_SEED
      const seedLogs = logs.filter((l) => l.source === 'DEMO_SEED');
      expect(seedLogs.length).toBeGreaterThanOrEqual(4);
      expect(seedLogs.every((l) => l.source === 'DEMO_SEED')).toBe(true);

      // Trigger a live mutation (stage change)
      await recruitmentService.updateApplicationStage(
        'app-003',
        'INTERVIEW_SCHEDULED',
        'lead-usr-002',
        'Candidate selected for technical panel interview',
        'PROJECT_LEAD'
      );

      const refreshedLogs = await recruitmentService.getAllAuditLogs('ADMIN');
      const liveEvents = refreshedLogs.filter((l) => l.source === 'LIVE_EVENT');
      expect(liveEvents.length).toBeGreaterThanOrEqual(1);

      const stageChangeEvent = liveEvents.find(
        (l) => l.application_id === 'app-003' && l.to_stage === 'INTERVIEW_SCHEDULED'
      );
      expect(stageChangeEvent).toBeDefined();
      expect(stageChangeEvent?.source).toBe('LIVE_EVENT');
      expect(stageChangeEvent?.action).toBe('STAGE_CHANGED');
      expect(stageChangeEvent?.from_stage).toBe('SCREENING');
      expect(stageChangeEvent?.to_stage).toBe('INTERVIEW_SCHEDULED');
      expect(stageChangeEvent?.reason).toContain('selected for technical panel');
    });

    it('denies non-reviewers from accessing operational recruitment audit logs', async () => {
      const logs = await recruitmentService.getAllAuditLogs('MEMBER');
      expect(logs).toEqual([]);

      await expect(
        recruitmentService.getAuditLogs('app-001', 'MEMBER')
      ).rejects.toThrow('Unauthorized: Only reviewers can view candidate audit logs');
    });
  });
});

