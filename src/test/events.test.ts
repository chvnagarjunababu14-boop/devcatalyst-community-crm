import { describe, it, expect, beforeEach } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { eventService } from '../services/eventService';
import { registrationService } from '../services/registrationService';
import { attendanceService } from '../services/attendanceService';

describe('Phase 4: Events, Registrations, Tickets & Attendance Module', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('1. Events Management & Lifecycle', () => {
    it('lists seeded events with registration counts', async () => {
      const events = await eventService.getEvents(undefined, 'admin-usr-001', 'ADMIN');
      expect(events.length).toBeGreaterThanOrEqual(4);

      const hackathon = events.find((e) => e.id === 'evt-001');
      expect(hackathon).toBeDefined();
      expect(hackathon?.title).toBe('DevCatalyst Annual Hackathon 2026');
      expect(hackathon?.status).toBe('PUBLISHED');
      expect(hackathon?.registered_count).toBeGreaterThanOrEqual(2);
    });

    it('filters events by status and format correctly', async () => {
      const published = await eventService.getEvents({ status: 'PUBLISHED' }, 'admin-usr-001', 'ADMIN');
      expect(published.every((e) => e.status === 'PUBLISHED')).toBe(true);

      const online = await eventService.getEvents({ format: 'ONLINE' }, 'admin-usr-001', 'ADMIN');
      expect(online.every((e) => e.format === 'ONLINE')).toBe(true);
    });

    it('creates a new event with valid date and capacity rules', async () => {
      const newEvent = await eventService.createEvent(
        {
          title: 'Advanced Agentic Coding Masterclass',
          description: 'A deep-dive session into LLM orchestrations and tool calling.',
          event_type: 'TECH_TALK',
          format: 'ONLINE',
          meeting_link: 'https://meet.devcatalyst.club/agentic-coding',
          start_time: '2026-11-20T14:00:00Z',
          end_time: '2026-11-20T16:00:00Z',
          registration_deadline: '2026-11-19T23:59:59Z',
          capacity: 100,
          is_public: true,
          status: 'PUBLISHED',
        },
        'admin-usr-001',
        'ADMIN'
      );

      expect(newEvent.id).toBeDefined();
      expect(newEvent.title).toBe('Advanced Agentic Coding Masterclass');
      expect(newEvent.capacity).toBe(100);
      expect(newEvent.status).toBe('PUBLISHED');
    });

    it('rejects event creation when end_time precedes start_time', async () => {
      await expect(
        eventService.createEvent(
          {
            title: 'Invalid Date Event',
            event_type: 'WORKSHOP',
            format: 'IN_PERSON',
            venue: 'Innovation Lab',
            start_time: '2026-11-20T16:00:00Z',
            end_time: '2026-11-20T14:00:00Z', // Ends before it starts
            registration_deadline: '2026-11-19T23:59:59Z',
            capacity: 50,
          },
          'admin-usr-001',
          'ADMIN'
        )
      ).rejects.toThrow('Event end time must be after the start time');
    });

    it('rejects event creation when registration deadline is after start_time', async () => {
      await expect(
        eventService.createEvent(
          {
            title: 'Invalid Deadline Event',
            event_type: 'WORKSHOP',
            format: 'IN_PERSON',
            venue: 'Innovation Lab',
            start_time: '2026-11-20T14:00:00Z',
            end_time: '2026-11-20T16:00:00Z',
            registration_deadline: '2026-11-21T00:00:00Z', // Deadline after event started
            capacity: 50,
          },
          'admin-usr-001',
          'ADMIN'
        )
      ).rejects.toThrow('Registration deadline must precede or equal the event start time');
    });

    it('rejects event creation when capacity is less than 1', async () => {
      await expect(
        eventService.createEvent(
          {
            title: 'Zero Capacity Event',
            event_type: 'WORKSHOP',
            format: 'IN_PERSON',
            venue: 'Innovation Lab',
            start_time: '2026-11-20T14:00:00Z',
            end_time: '2026-11-20T16:00:00Z',
            registration_deadline: '2026-11-19T23:59:59Z',
            capacity: 0,
          },
          'admin-usr-001',
          'ADMIN'
        )
      ).rejects.toThrow('Event capacity must be greater than zero');
    });

    it('enforces required venue for IN_PERSON and meeting link for ONLINE', async () => {
      // IN_PERSON without venue
      await expect(
        eventService.createEvent(
          {
            title: 'Missing Venue Workshop',
            event_type: 'WORKSHOP',
            format: 'IN_PERSON',
            start_time: '2026-11-20T14:00:00Z',
            end_time: '2026-11-20T16:00:00Z',
            registration_deadline: '2026-11-19T23:59:59Z',
            capacity: 30,
          },
          'admin-usr-001',
          'ADMIN'
        )
      ).rejects.toThrow('Venue location is required for in-person events');

      // ONLINE without meeting link
      await expect(
        eventService.createEvent(
          {
            title: 'Missing Link Webinar',
            event_type: 'TECH_TALK',
            format: 'ONLINE',
            start_time: '2026-11-20T14:00:00Z',
            end_time: '2026-11-20T16:00:00Z',
            registration_deadline: '2026-11-19T23:59:59Z',
            capacity: 30,
          },
          'admin-usr-001',
          'ADMIN'
        )
      ).rejects.toThrow('Meeting link is required for online events');
    });

    it('enforces valid lifecycle state transitions', async () => {
      // evt-004 is COMPLETED. Trying to set it back to DRAFT should fail
      await expect(
        eventService.updateEvent(
          'evt-004',
          { status: 'DRAFT' },
          'admin-usr-001',
          'ADMIN'
        )
      ).rejects.toThrow('Cannot transition event from COMPLETED to DRAFT');

      // Draft evt-003 to PUBLISHED should succeed
      const published = await eventService.updateEvent(
        'evt-003',
        { status: 'PUBLISHED' },
        'admin-usr-001',
        'ADMIN'
      );
      expect(published.status).toBe('PUBLISHED');
    });

    it('rejects unauthorized updates from non-privileged members', async () => {
      await expect(
        eventService.updateEvent(
          'evt-001',
          { title: 'Hacked Title' },
          'member-usr-003',
          'MEMBER'
        )
      ).rejects.toThrow('Unauthorized: You do not have permission to edit this event');
    });
  });

  describe('2. Participant Registration & Atomic Capacity Rules', () => {
    it('registers a participant successfully and returns opaque token + ticket code', async () => {
      const reg = await registrationService.registerParticipant({
        event_id: 'evt-001',
        participant_name: 'Alex Rivera',
        participant_email: 'alex.rivera@cs.edu',
        institution: 'Computing College',
        participant_phone: '+1 555-0192',
      });

      expect(reg.id).toBeDefined();
      expect(reg.status).toBe('CONFIRMED');
      expect(reg.ticket_code).toMatch(/^DC-TK-[0-9A-F]{6}$/);
      expect(reg.ticket_token).toMatch(/^tkt_[0-9a-f]{32}$/);
      expect(reg.participant_name).toBe('Alex Rivera');
    });

    it('prevents duplicate active registrations for the same email and event', async () => {
      // Seed registration already exists for marcus.member@devcatalyst.club on evt-001
      await expect(
        registrationService.registerParticipant({
          event_id: 'evt-001',
          participant_name: 'Marcus Vance Duplicate',
          participant_email: 'marcus.member@devcatalyst.club',
        })
      ).rejects.toThrow('You already have an active registration for this event');
    });

    it('rejects registration when event is not published', async () => {
      // evt-003 is in DRAFT
      await expect(
        registrationService.registerParticipant({
          event_id: 'evt-003',
          participant_name: 'Samantha Ray',
          participant_email: 'samantha@example.com',
        })
      ).rejects.toThrow('This event is not currently accepting registrations');
    });

    it('rejects registration when registration deadline has passed', async () => {
      // Create a published event with a past deadline
      const expiredEvent = await eventService.createEvent(
        {
          title: 'Expired Deadline Event',
          event_type: 'TECH_TALK',
          format: 'ONLINE',
          meeting_link: 'https://meet.devcatalyst.club/expired',
          start_time: '2026-11-20T10:00:00Z',
          end_time: '2026-11-20T11:00:00Z',
          registration_deadline: '2026-10-01T23:59:59Z',
          capacity: 50,
          status: 'PUBLISHED',
        },
        'admin-usr-001',
        'ADMIN'
      );

      await expect(
        registrationService.registerParticipant({
          event_id: expiredEvent.id,
          participant_name: 'Past Deadline User',
          participant_email: 'past.deadline@example.com',
        })
      ).rejects.toThrow('The registration deadline for this event has passed');
    });

    it('enforces event capacity strictly', async () => {
      // Create an event with capacity 1
      const smallEvent = await eventService.createEvent(
        {
          title: 'VIP Round Table',
          event_type: 'MEETUP',
          format: 'ONLINE',
          meeting_link: 'https://meet.devcatalyst.club/vip',
          start_time: '2026-11-28T10:00:00Z',
          end_time: '2026-11-28T11:00:00Z',
          registration_deadline: '2026-11-27T23:59:59Z',
          capacity: 1,
          status: 'PUBLISHED',
        },
        'admin-usr-001',
        'ADMIN'
      );

      // First participant succeeds
      const first = await registrationService.registerParticipant({
        event_id: smallEvent.id,
        participant_name: 'Lucky First',
        participant_email: 'lucky@vip.org',
      });
      expect(first.status).toBe('CONFIRMED');

      // Second participant is rejected due to capacity limit
      await expect(
        registrationService.registerParticipant({
          event_id: smallEvent.id,
          participant_name: 'Unlucky Second',
          participant_email: 'second@vip.org',
        })
      ).rejects.toThrow('This event has reached maximum capacity');
    });

    it('supports cancellation and handles reactivation without duplicate rows', async () => {
      // Register a participant
      const reg = await registrationService.registerParticipant({
        event_id: 'evt-001',
        participant_name: 'Charlie Davis',
        participant_email: 'charlie.davis@example.com',
      });
      expect(reg.status).toBe('CONFIRMED');

      // Cancel registration
      const cancelled = await registrationService.cancelRegistration(reg.id, 'admin-usr-001', 'ADMIN');
      expect(cancelled.status).toBe('CANCELLED');

      // Re-registering with the same email should reactivate the existing row with fresh token
      const reactivated = await registrationService.registerParticipant({
        event_id: 'evt-001',
        participant_name: 'Charlie Davis',
        participant_email: 'charlie.davis@example.com',
      });

      expect(reactivated.id).toBe(reg.id); // Same row ID
      expect(reactivated.status).toBe('CONFIRMED');
      expect(reactivated.ticket_token).not.toBe(reg.ticket_token); // Refreshed token
    });
  });

  describe('3. Ticket Verification & Attendance Check-in', () => {
    it('verifies a valid ticket and records attendance successfully', async () => {
      // reg-001 has ticket_code: 'DC-TK-8A42F1', ticket_token: 'tkt_a9b1c2d3e4f5061728394a5b6c7d8e9f' for evt-001
      const result = await attendanceService.verifyAndCheckInTicket(
        'evt-001',
        'DC-TK-8A42F1',
        'admin-usr-001',
        'MANUAL'
      );

      expect(result.success).toBe(true);
      expect(result.code).toBe('CHECKED_IN');
      expect(result.registration?.participant_name).toBe('Marcus Vance');
      expect(result.attendance?.checked_in_by).toBe('admin-usr-001');
    });

    it('verifies ticket via opaque crypto token (QR scan simulation)', async () => {
      // reg-002 on evt-001 has token 'tkt_123456789abcdef0123456789abcdef0'
      const result = await attendanceService.verifyAndCheckInTicket(
        'evt-001',
        'tkt_123456789abcdef0123456789abcdef0',
        'admin-usr-001',
        'QR_SCAN'
      );

      expect(result.success).toBe(true);
      expect(result.code).toBe('CHECKED_IN');
      expect(result.registration?.participant_name).toBe('Jordan Lee');
    });

    it('prevents duplicate check-in for an already attended registration', async () => {
      // Check in reg-001 first
      await attendanceService.verifyAndCheckInTicket(
        'evt-001',
        'DC-TK-8A42F1',
        'admin-usr-001',
        'MANUAL'
      );

      // Attempt second check-in
      const secondCheckIn = await attendanceService.verifyAndCheckInTicket(
        'evt-001',
        'DC-TK-8A42F1',
        'admin-usr-001',
        'MANUAL'
      );

      expect(secondCheckIn.success).toBe(false);
      expect(secondCheckIn.code).toBe('ALREADY_CHECKED_IN');
      expect(secondCheckIn.message).toContain('Already checked in');
    });

    it('rejects an invalid non-existent ticket identifier', async () => {
      const result = await attendanceService.verifyAndCheckInTicket(
        'evt-001',
        'DC-TK-NONEXISTENT',
        'admin-usr-001'
      );

      expect(result.success).toBe(false);
      expect(result.code).toBe('INVALID_TICKET');
    });

    it('rejects a ticket belonging to a different event (WRONG_EVENT)', async () => {
      // reg-003 is registered for evt-002 ('DC-TK-7B14A9')
      const result = await attendanceService.verifyAndCheckInTicket(
        'evt-001', // Passing evt-001 instead of evt-002
        'DC-TK-7B14A9',
        'admin-usr-001'
      );

      expect(result.success).toBe(false);
      expect(result.code).toBe('WRONG_EVENT');
    });

    it('rejects ticket for a cancelled registration', async () => {
      // Register fresh participant and cancel
      const reg = await registrationService.registerParticipant({
        event_id: 'evt-001',
        participant_name: 'Cancellable Attendee',
        participant_email: 'cancellable@example.com',
      });

      await registrationService.cancelRegistration(reg.id, 'admin-usr-001', 'ADMIN');

      const result = await attendanceService.verifyAndCheckInTicket(
        'evt-001',
        reg.ticket_code,
        'admin-usr-001'
      );

      expect(result.success).toBe(false);
      expect(result.code).toBe('REGISTRATION_CANCELLED');
    });

    it('provides manual roster check-in helper for staff', async () => {
      // Register fresh participant and manually check in
      const reg = await registrationService.registerParticipant({
        event_id: 'evt-001',
        participant_name: 'Manual Checkin Guest',
        participant_email: 'manual.checkin@example.com',
      });

      const result = await attendanceService.manualCheckIn(
        'evt-001',
        reg.id,
        'admin-usr-001',
        'Checked in at door desk'
      );

      expect(result.success).toBe(true);
      expect(result.registration?.status).toBe('ATTENDED');
    });
  });

  describe('4. Privacy & Authorization Scopes', () => {
    it('restricts attendee roster visibility from unauthorized roles', async () => {
      await expect(
        attendanceService.getEventAttendance('evt-001', 'member-usr-003', 'MEMBER')
      ).rejects.toThrow('Unauthorized: Only organizers can view event attendance records');
    });

    it('allows organizers and administrators to view full attendance logs', async () => {
      const logs = await attendanceService.getEventAttendance('evt-004', 'admin-usr-001', 'ADMIN');
      expect(logs.length).toBeGreaterThanOrEqual(1);
      expect(logs[0].registration).toBeDefined();
    });
  });
});
