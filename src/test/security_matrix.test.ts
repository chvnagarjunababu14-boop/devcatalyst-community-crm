import { describe, it, expect, beforeEach } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { authService } from '../services/authService';
import { projectService } from '../services/projectService';
import { taskService } from '../services/taskService';
import { eventService } from '../services/eventService';
import { registrationService } from '../services/registrationService';
import { attendanceService } from '../services/attendanceService';
import { recruitmentService } from '../services/recruitmentService';
import { memberService } from '../services/memberService';
import type { Role } from '../types/auth';

describe('Phase 6: Authorization Test Matrix & Security Boundary Verification', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  // ===========================================================================
  // 1. ANONYMOUS VISITOR MATRIX
  // ===========================================================================
  describe('1. Anonymous Visitor Authorization Matrix', () => {
    it('allows browsing published public events, but hides draft/internal events', async () => {
      const publicEvents = await eventService.getEvents(undefined, undefined, undefined);
      expect(publicEvents.every((e) => e.status === 'PUBLISHED' && e.is_public)).toBe(true);

      // Attempting to filter for DRAFT events as anonymous must return empty / omit drafts
      const draftEvents = await eventService.getEvents({ status: 'DRAFT' }, undefined, undefined);
      expect(draftEvents.length).toBe(0);
    });

    it('denies creating, modifying, or deleting events', async () => {
      await expect(
        eventService.createEvent(
          {
            title: 'Malicious Event',
            description: 'Attempted by anonymous actor',
            event_type: 'TECH_TALK',
            format: 'ONLINE',
            start_time: '2026-12-01T10:00:00Z',
            end_time: '2026-12-01T12:00:00Z',
            registration_deadline: '2026-11-30T23:59:59Z',
            capacity: 50,
          },
          undefined,
          undefined
        )
      ).rejects.toThrow('Unauthorized');
    });

    it('allows registering for a published event as a guest participant', async () => {
      const reg = await registrationService.registerParticipant({
        event_id: 'evt-001',
        participant_name: 'Guest Hacker',
        participant_email: 'guest.hacker@university.edu',
        participant_phone: '+1 555-0199',
        institution: 'Open Tech Institute',
      });

      expect(reg.id).toBeDefined();
      expect(reg.ticket_token).toMatch(/^tkt_[a-f0-9]{32}$/);
    });

    it('denies inspecting registration attendee lists or scanning tickets', async () => {
      await expect(
        registrationService.getRegistrations({ eventId: 'evt-001' }, undefined, undefined)
      ).rejects.toThrow('Unauthorized');

      await expect(
        attendanceService.verifyAndCheckInTicket('evt-001', 'tkt_any_token', undefined)
      ).rejects.toThrow('Unauthorized');
    });

    it('denies creating or deleting projects and tasks', async () => {
      await expect(
        projectService.createProject(
          {
            title: 'Unauthorized Project',
            description: 'Anonymous creation attempt',
          },
          undefined,
          undefined
        )
      ).rejects.toThrow('Unauthorized');

      await expect(
        taskService.createTask(
          {
            project_id: 'prj-001',
            title: 'Unauthorized Task',
          },
          undefined,
          undefined
        )
      ).rejects.toThrow('Unauthorized');
    });

    it('allows submitting a recruitment application and checking safe reference status', async () => {
      const submission = await recruitmentService.submitApplication({
        cycle_id: 'cycle-001',
        applicant_name: 'Anonymous Candidate',
        applicant_email: 'anon.candidate@university.edu',
        institution: 'Polytechnic Institute',
        domain: 'ENGINEERING',
        skills: ['Python', 'SQL'],
        experience_summary: '2 years of backend programming and script automation.',
        motivation: 'Passionate about club engineering projects.',
      });

      expect(submission.reference_code).toBeDefined();

      // Look up status by reference code
      const status = await recruitmentService.getApplicationStatusByRef(submission.reference_code);
      expect(status?.stage).toBe('APPLIED');
      expect((status as any).internal_notes).toBeUndefined();
      expect((status as any).scorecards).toBeUndefined();
    });

    it('denies accessing the candidate review pipeline or scorecards', async () => {
      await expect(
        recruitmentService.getApplications({ cycleId: 'cycle-001' }, undefined)
      ).rejects.toThrow('Unauthorized');
    });

    it('masks emails and hides phone numbers in member directory', async () => {
      const members = await memberService.getMembers(undefined, undefined, undefined);
      expect(members.length).toBeGreaterThan(0);
      expect(members.every((m) => m.email.includes('***@devcatalyst.club'))).toBe(true);
      expect(members.every((m) => m.phone === null)).toBe(true);
    });
  });

  // ===========================================================================
  // 2. AUTHENTICATED CLUB MEMBER MATRIX
  // ===========================================================================
  describe('2. Authenticated Club Member Matrix (Marcus Vance, role=MEMBER)', () => {
    const memberId = 'member-usr-003';
    const memberRole: Role = 'MEMBER';

    it('permits viewing member directory with unmasked emails but hides private phone numbers', async () => {
      const members = await memberService.getMembers(undefined, memberId, memberRole);
      expect(members.length).toBeGreaterThan(0);
      expect(members[0].email).not.toContain('***@devcatalyst.club');
      // Private phone numbers must remain hidden (null) from standard club members
      expect(members.every((m) => m.phone === null)).toBe(true);
    });

    it('denies updating member lifecycle status or domains of other members', async () => {
      await expect(
        memberService.updateMemberStatus('lead-usr-002', 'INACTIVE', memberId, memberRole)
      ).rejects.toThrow('Unauthorized');

      await expect(
        memberService.updateMemberDomains('lead-usr-002', ['OUTREACH'], memberId, memberRole)
      ).rejects.toThrow('Unauthorized');
    });

    it('denies creating projects or deleting existing projects', async () => {
      await expect(
        projectService.createProject(
          {
            title: 'Member Attempted Project',
            description: 'Should be rejected',
          },
          memberId,
          memberRole
        )
      ).rejects.toThrow('Unauthorized');

      await expect(
        projectService.deleteProject('prj-001', memberId, memberRole)
      ).rejects.toThrow('Unauthorized');
    });

    it('denies accessing candidate recruitment pipeline and scorecards', async () => {
      await expect(
        recruitmentService.getApplications({ cycleId: 'cycle-001' }, memberRole)
      ).rejects.toThrow('Unauthorized');

      await expect(
        recruitmentService.submitScorecard(
          {
            application_id: 'app-001',
            interviewer_id: memberId,
            technical_score: 5,
            collaboration_score: 5,
            communication_score: 5,
            domain_skill_score: 5,
            written_evidence: 'Self evaluation attempt',
            recommendation: 'STRONG_HIRE',
          },
          memberId,
          memberRole
        )
      ).rejects.toThrow('Unauthorized');
    });
  });

  // ===========================================================================
  // 3. PROJECT CONTRIBUTOR VS PROJECT VIEWER MATRIX
  // ===========================================================================
  describe('3. Project Role Matrix (CONTRIBUTOR vs VIEWER)', () => {
    it('allows a CONTRIBUTOR to create tasks and advance task status', async () => {
      // In prj-001, member-usr-003 is a CONTRIBUTOR
      const newTask = await taskService.createTask(
        {
          project_id: 'prj-001',
          title: 'Implement Dark Mode Color Tokens',
          priority: 'MEDIUM',
          assignee_id: 'member-usr-003',
        },
        'member-usr-003',
        'MEMBER'
      );

      expect(newTask.id).toBeDefined();
      expect(newTask.task_number).toMatch(/^TSK-\d+$/);

      // Advance task status
      const updated = await taskService.updateTask(
        newTask.id,
        { status: 'IN_PROGRESS' },
        'member-usr-003',
        'MEMBER'
      );
      expect(updated.status).toBe('IN_PROGRESS');
    });

    it('strictly denies a VIEWER from creating tasks in their project', async () => {
      // In prj-002, member-usr-003 has project_role = 'VIEWER'
      await expect(
        taskService.createTask(
          {
            project_id: 'prj-002',
            title: 'Task by Viewer',
            priority: 'LOW',
          },
          'member-usr-003',
          'MEMBER'
        )
      ).rejects.toThrow(/Unauthorized: Viewer role cannot create or modify tasks/);
    });

    it('strictly denies a VIEWER from updating task statuses in their project', async () => {
      // Create a task as admin in prj-002
      const task = await taskService.createTask(
        {
          project_id: 'prj-002',
          title: 'Admin Created Task in PRJ-02',
          priority: 'HIGH',
        },
        'admin-usr-001',
        'ADMIN'
      );

      // Attempt status change as VIEWER
      await expect(
        taskService.updateTask(
          task.id,
          { status: 'DONE' },
          'member-usr-003',
          'MEMBER'
        )
      ).rejects.toThrow(/Unauthorized: Viewer role cannot create or modify tasks/);
    });

    it('enforces task assignee membership invariant: cannot assign task to non-member', async () => {
      // Attempt to assign a task in prj-002 to someone who is NOT a project member
      await expect(
        taskService.createTask(
          {
            project_id: 'prj-002',
            title: 'Task for outsider',
            assignee_id: 'outsider-usr-999',
          },
          'admin-usr-001',
          'ADMIN'
        )
      ).rejects.toThrow(/Task assignee must be an existing member of this project/);
    });
  });

  // ===========================================================================
  // 4. PROJECT LEAD MATRIX
  // ===========================================================================
  describe('4. Project Lead Matrix (Sarah Chen, role=PROJECT_LEAD)', () => {
    const leadId = 'lead-usr-002';
    const leadRole: Role = 'PROJECT_LEAD';

    it('allows updating project metadata for projects they lead', async () => {
      // Sarah leads prj-001
      const updated = await projectService.updateProject(
        'prj-001',
        { description: 'Updated roadmap description for PRJ-01' },
        leadId,
        leadRole
      );
      expect(updated.description).toBe('Updated roadmap description for PRJ-01');
    });

    it('denies deleting projects (only ADMIN can delete)', async () => {
      await expect(
        projectService.deleteProject('prj-001', leadId, leadRole)
      ).rejects.toThrow('Unauthorized');
    });

    it('allows accessing recruitment pipeline as reviewer and scheduling interviews', async () => {
      const apps = await recruitmentService.getApplications({ cycleId: 'cycle-001' }, leadRole);
      expect(apps.length).toBeGreaterThan(0);

      const interview = await recruitmentService.scheduleInterview(
        {
          application_id: 'app-003',
          scheduled_at: '2026-11-20T16:00:00Z',
          duration_minutes: 45,
          time_zone: 'UTC',
          interviewer_id: leadId,
          format: 'ONLINE',
          meeting_link: 'https://meet.google.com/devcat-lead-interview',
        },
        leadId,
        leadRole
      );
      expect(interview.status).toBe('SCHEDULED');
    });
  });

  // ===========================================================================
  // 5. ORGANIZER MATRIX
  // ===========================================================================
  describe('5. Organizer Matrix (role=ORGANIZER)', () => {
    const orgId = 'admin-usr-001';
    const orgRole: Role = 'ORGANIZER';

    it('allows creating, updating, and publishing events', async () => {
      const event = await eventService.createEvent(
        {
          title: 'Full-Stack Security Symposium',
          description: 'Secure development practices and RLS policy design.',
          event_type: 'WORKSHOP',
          format: 'ONLINE',
          meeting_link: 'https://meet.devcatalyst.club/security-symposium',
          start_time: '2026-12-10T14:00:00Z',
          end_time: '2026-12-10T16:00:00Z',
          registration_deadline: '2026-12-09T23:59:59Z',
          capacity: 80,
          is_public: true,
          status: 'PUBLISHED',
        },
        orgId,
        orgRole
      );

      expect(event.id).toBeDefined();
      expect(event.status).toBe('PUBLISHED');
    });

    it('allows viewing attendee registrations and checking in tickets', async () => {
      // Register participant
      const reg = await registrationService.registerParticipant({
        event_id: 'evt-001',
        participant_name: 'Attendee One',
        participant_email: 'attendee.one@college.edu',
      });

      // Organizer can view registrations
      const list = await registrationService.getRegistrations({ eventId: 'evt-001' }, orgId, orgRole);
      expect(list.length).toBeGreaterThan(0);

      // Organizer can check in ticket
      const checkin = await attendanceService.verifyAndCheckInTicket(
        'evt-001',
        reg.ticket_token,
        orgId
      );
      expect(checkin.success).toBe(true);
      expect(checkin.code).toBe('CHECKED_IN');
    });

    it('denies granting or modifying user roles (strictly ADMIN privilege)', async () => {
      await expect(
        authService.assignUserRole('member-usr-003', 'ADMIN', orgRole)
      ).rejects.toThrow('Unauthorized');
    });
  });

  // ===========================================================================
  // 6. ADMINISTRATOR MATRIX
  // ===========================================================================
  describe('6. Administrator Matrix (Alex Rivera, role=ADMIN)', () => {
    const adminId = 'admin-usr-001';
    const adminRole: Role = 'ADMIN';

    it('allows granting roles, onboarding members, and re-evaluating decisions', async () => {
      // Role grant
      const updatedUser = await authService.assignUserRole('member-usr-003', 'PROJECT_LEAD', adminRole);
      expect(updatedUser.roles).toContain('PROJECT_LEAD');

      // Onboard accepted candidate app-004
      const onboard = await recruitmentService.onboardAcceptedApplicant('app-004', adminId, adminRole);
      expect(onboard.success).toBe(true);

      // Admin can view unmasked contact details in Member CRM
      const alex = await memberService.getMemberById('admin-usr-001', adminId, adminRole);
      expect(alex?.phone).toBeDefined();
    });

    it('allows deleting projects and purging obsolete tasks', async () => {
      const newProj = await projectService.createProject(
        {
          title: 'Temporary Test Project',
          description: 'To be deleted by administrator',
        },
        adminId,
        adminRole
      );

      await projectService.deleteProject(newProj.id, adminId, adminRole);
      const remaining = await projectService.getProjects(adminId, adminRole);
      expect(remaining.some((p) => p.id === newProj.id)).toBe(false);
    });
  });

  // ===========================================================================
  // 7. CONCURRENCY, CAPACITY BOUNDARY & FRAUD PREVENTION INVARIANTS
  // ===========================================================================
  describe('7. Concurrency, Capacity & Ticket Invariants', () => {
    it('strictly enforces event capacity: rejects registrations beyond capacity limit', async () => {
      // Create small event with capacity = 2
      const smallEvent = await eventService.createEvent(
        {
          title: 'Exclusive Micro Workshop',
          event_type: 'WORKSHOP',
          format: 'ONLINE',
          meeting_link: 'https://meet.devcatalyst.club/micro-workshop',
          start_time: '2026-12-15T10:00:00Z',
          end_time: '2026-12-15T11:00:00Z',
          registration_deadline: '2026-12-14T23:59:59Z',
          capacity: 2,
          is_public: true,
          status: 'PUBLISHED',
        },
        'admin-usr-001',
        'ADMIN'
      );

      // Register seat 1
      const seat1 = await registrationService.registerParticipant({
        event_id: smallEvent.id,
        participant_name: 'Seat One',
        participant_email: 'seat1@university.edu',
      });
      expect(seat1.ticket_token).toBeDefined();

      // Register seat 2
      const seat2 = await registrationService.registerParticipant({
        event_id: smallEvent.id,
        participant_name: 'Seat Two',
        participant_email: 'seat2@university.edu',
      });
      expect(seat2.ticket_token).toBeDefined();

      // Attempt seat 3 -> must be rejected with capacity error
      await expect(
        registrationService.registerParticipant({
          event_id: smallEvent.id,
          participant_name: 'Seat Three',
          participant_email: 'seat3@university.edu',
        })
      ).rejects.toThrow('This event has reached maximum capacity');
    });

    it('prevents duplicate active registrations for the same participant email', async () => {
      const reg = await registrationService.registerParticipant({
        event_id: 'evt-001',
        participant_name: 'Duplicate Tester',
        participant_email: 'dup.tester@college.edu',
      });
      expect(reg.ticket_token).toBeDefined();

      // Second attempt with same email
      await expect(
        registrationService.registerParticipant({
          event_id: 'evt-001',
          participant_name: 'Duplicate Tester',
          participant_email: 'dup.tester@college.edu',
        })
      ).rejects.toThrow('You already have an active registration for this event');
    });

    it('reactivates previously cancelled registration upon new registration attempt', async () => {
      const reg = await registrationService.registerParticipant({
        event_id: 'evt-001',
        participant_name: 'Reactivate Candidate',
        participant_email: 'reactivate@college.edu',
      });

      // Cancel registration
      await registrationService.cancelRegistration(reg.id, 'admin-usr-001', 'ADMIN');

      // Register again -> should reactivate and succeed
      const reactivated = await registrationService.registerParticipant({
        event_id: 'evt-001',
        participant_name: 'Reactivate Candidate',
        participant_email: 'reactivate@college.edu',
      });

      expect(reactivated.status).toBe('CONFIRMED');
    });

    it('detects duplicate check-in attempts and prevents double entry', async () => {
      const reg = await registrationService.registerParticipant({
        event_id: 'evt-001',
        participant_name: 'Checkin Double Tester',
        participant_email: 'double.checkin@college.edu',
      });

      // First check-in succeeds
      const firstCheckin = await attendanceService.verifyAndCheckInTicket(
        'evt-001',
        reg.ticket_token,
        'admin-usr-001'
      );
      expect(firstCheckin.success).toBe(true);
      expect(firstCheckin.code).toBe('CHECKED_IN');

      // Second check-in must fail with ALREADY_CHECKED_IN
      const secondCheckin = await attendanceService.verifyAndCheckInTicket(
        'evt-001',
        reg.ticket_token,
        'admin-usr-001'
      );
      expect(secondCheckin.success).toBe(false);
      expect(secondCheckin.code).toBe('ALREADY_CHECKED_IN');
    });

    it('rejects tickets scanned against the wrong event', async () => {
      // Register for evt-001
      const regEvt1 = await registrationService.registerParticipant({
        event_id: 'evt-001',
        participant_name: 'Cross Event Scanner',
        participant_email: 'cross.scanner@college.edu',
      });

      // Attempt scanning ticket from evt-001 at evt-002
      const crossScan = await attendanceService.verifyAndCheckInTicket(
        'evt-002',
        regEvt1.ticket_token,
        'admin-usr-001'
      );

      expect(crossScan.success).toBe(false);
      expect(crossScan.code).toBe('WRONG_EVENT');
    });
  });
});
