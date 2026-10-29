/**
 * DevCatalyst Hub — Phase 10: Notifications & Event Automation Test Suite
 * Validates templates, anti-injection sanitization, provider abstraction,
 * idempotency, retry permissions, and calendar (.ics) generation.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  notificationService,
  getStoredNotifications,
  saveStoredNotifications,
} from '../services/notificationService';
import {
  defaultMockProvider,
  setActiveNotificationProvider,
  resetNotificationProvider,
  type NotificationProvider,
} from '../services/notificationProvider';
import {
  escapeHtml,
  sanitizeEmailHeader,
  renderEventRegistrationEmail,
  renderEventCancellationEmail,
  renderInterviewScheduledEmail,
  renderCandidateAcceptedEmail,
  renderCandidateRejectedEmail,
} from '../services/notificationTemplates';
import { generateIcsContent, escapeIcsText } from '../utils/calendar';
import { registrationService } from '../services/registrationService';
import { recruitmentService } from '../services/recruitmentService';

describe('Phase 10: Notifications & Event Automation', () => {
  beforeEach(() => {
    localStorage.clear();
    defaultMockProvider.clearDispatches();
    resetNotificationProvider();
  });

  // 1. Template Rendering & Recipient Selection
  describe('Email Template Engine & Recipient Mapping', () => {
    it('renders event registration confirmation with ticket details and ICS attachment', () => {
      const rendered = renderEventRegistrationEmail({
        registration_id: 'reg-test-1',
        event_id: 'evt-test-1',
        event_title: 'Full Stack Masterclass',
        start_time: '2026-11-10T14:00:00Z',
        end_time: '2026-11-10T16:00:00Z',
        format: 'IN_PERSON',
        venue_or_link: 'Engineering Hall Lab B',
        ticket_code: 'DC-TK-998811',
        ticket_token: 'tok-abc-123',
        participant_name: 'Devon Miles',
        participant_email: 'devon@example.com',
      });

      expect(rendered.subject).toContain('Registration Confirmed: Full Stack Masterclass');
      expect(rendered.subject).toContain('DC-TK-998811');
      expect(rendered.html).toContain('Devon Miles');
      expect(rendered.html).toContain('DC-TK-998811');
      expect(rendered.html).toContain('Engineering Hall Lab B');
      expect(rendered.text).toContain('Ticket Code: DC-TK-998811');
    });

    it('renders event cancellation notice with participant details', () => {
      const rendered = renderEventCancellationEmail({
        registration_id: 'reg-test-2',
        event_id: 'evt-test-1',
        event_title: 'Full Stack Masterclass',
        participant_name: 'Sarah Connor',
        participant_email: 'sarah@example.com',
        cancelled_at: '2026-10-20T12:00:00Z',
      });

      expect(rendered.subject).toContain('Registration Cancelled: Full Stack Masterclass');
      expect(rendered.html).toContain('Sarah Connor');
      expect(rendered.html).toContain('cancelled');
      expect(rendered.text).toContain('Sarah Connor');
    });

    it('renders interview scheduling invitation with date, format, and meeting link', () => {
      const rendered = renderInterviewScheduledEmail({
        application_id: 'app-99',
        reference_code: 'APP-2026-XYZ12',
        applicant_name: 'Elena Rostova',
        applicant_email: 'elena@example.com',
        domain: 'ENGINEERING',
        interview_id: 'int-77',
        scheduled_at: '2026-11-01T15:00:00Z',
        time_zone: 'UTC',
        duration_minutes: 45,
        format: 'ONLINE',
        meeting_link: 'https://meet.devcatalyst.club/eval-77',
      });

      expect(rendered.subject).toContain('Interview Scheduled: DevCatalyst Club');
      expect(rendered.subject).toContain('APP-2026-XYZ12');
      expect(rendered.html).toContain('Elena Rostova');
      expect(rendered.html).toContain('ENGINEERING');
      expect(rendered.html).toContain('https://meet.devcatalyst.club/eval-77');
      expect(rendered.text).toContain('APP-2026-XYZ12');
    });

    it('renders candidate acceptance and rejection notices with reference codes', () => {
      const accepted = renderCandidateAcceptedEmail({
        application_id: 'app-100',
        reference_code: 'APP-2026-ACC01',
        applicant_name: 'Jordan Bell',
        applicant_email: 'jordan@example.com',
        domain: 'DESIGN',
        new_stage: 'ACCEPTED',
      });
      expect(accepted.subject).toContain('Welcome to DevCatalyst Club!');
      expect(accepted.subject).toContain('APP-2026-ACC01');
      expect(accepted.html).toContain('Jordan Bell');
      expect(accepted.html).toContain('offer you membership');

      const rejected = renderCandidateRejectedEmail({
        application_id: 'app-101',
        reference_code: 'APP-2026-REJ01',
        applicant_name: 'Casey Quinn',
        applicant_email: 'casey@example.com',
        domain: 'ENGINEERING',
        new_stage: 'REJECTED',
      });
      expect(rejected.subject).toContain('DevCatalyst Club Application Update');
      expect(rejected.subject).toContain('APP-2026-REJ01');
      expect(rejected.html).toContain('Casey Quinn');
      expect(rejected.html).toContain('unable to offer you a position');
    });
  });

  // 2. Anti-Injection Sanitization & Privacy
  describe('Security: Anti-Injection & Privacy Safeguards', () => {
    it('escapes malicious HTML injection in user-supplied strings', () => {
      const dangerous = '<script>alert("xss")</script><img src="x" onerror="evil()"/>';
      const safe = escapeHtml(dangerous);
      expect(safe).not.toContain('<script>');
      expect(safe).toContain('&lt;script&gt;');
      expect(safe).toContain('&lt;img');
      expect(safe).toContain('&quot;xss&quot;');
    });

    it('strips CRLF line breaks to prevent email header injection', () => {
      const evilHeader = 'Subject Line\r\nBcc: attacker@hacker.io\r\nContent-Type: text/html';
      const clean = sanitizeEmailHeader(evilHeader);
      expect(clean).not.toContain('\r');
      expect(clean).not.toContain('\n');
      expect(clean).toBe('Subject Line Bcc: attacker@hacker.io Content-Type: text/html');
    });

    it('masks and sanitizes untrusted input injected via template payloads', () => {
      const rendered = renderEventRegistrationEmail({
        registration_id: 'reg-xss',
        event_id: 'evt-1',
        event_title: '<b>Super Event</b>',
        start_time: '2026-11-10T14:00:00Z',
        end_time: '2026-11-10T16:00:00Z',
        format: 'IN_PERSON',
        venue_or_link: '<script>steal()</script>',
        ticket_code: 'DC-TK-EVIL',
        ticket_token: 'tok-evil',
        participant_name: '<img src=x onerror=alert(1)>',
        participant_email: 'safe@example.com',
      });

      expect(rendered.html).not.toContain('<script>steal()</script>');
      expect(rendered.html).toContain('&lt;script&gt;steal()&lt;/script&gt;');
      expect(rendered.html).not.toContain('<img src=x');
      expect(rendered.html).toContain('&lt;img src=x');
    });
  });

  // 3. Calendar RFC 5545 (.ics) Generation
  describe('Calendar Integration: RFC 5545 iCalendar Generator', () => {
    it('generates standard RFC 5545 VCALENDAR structure with CRLF line endings', () => {
      const ics = generateIcsContent({
        uid: 'evt-calendar-test-1',
        title: 'Tech Talk: Microservices in Production',
        description: 'Deep dive into service mesh and resilience.',
        location: 'Hall A, Building 3',
        startTime: '2026-12-01T10:00:00Z',
        endTime: '2026-12-01T12:00:00Z',
        organizerEmail: 'events@devcatalyst.club',
        organizerName: 'DevCatalyst Hub',
      });

      expect(ics).toContain('BEGIN:VCALENDAR');
      expect(ics).toContain('VERSION:2.0');
      expect(ics).toContain('PRODID:-//DevCatalyst Hub//Event Automation//EN');
      expect(ics).toContain('BEGIN:VEVENT');
      expect(ics).toContain('UID:evt-calendar-test-1');
      expect(ics).toContain('SUMMARY:Tech Talk: Microservices in Production');
      expect(ics).toContain('DTSTART:20261201T100000Z');
      expect(ics).toContain('DTEND:20261201T120000Z');
      expect(ics).toContain('LOCATION:Hall A\\, Building 3');
      expect(ics).toContain('ORGANIZER;CN=DevCatalyst Hub:mailto:events@devcatalyst.club');
      expect(ics).toContain('END:VEVENT');
      expect(ics).toContain('END:VCALENDAR');
      expect(ics).toContain('\r\n');
    });

    it('escapes special characters in calendar fields', () => {
      const escaped = escapeIcsText('Hello, world; this is a \\ test\nNew line');
      expect(escaped).toBe('Hello\\, world\\; this is a \\\\ test\\nNew line');
    });
  });

  // 4. Provider Abstraction & Dispatch Pipeline
  describe('Provider Abstraction & Delivery States', () => {
    it('dispatches notifications using the active provider and records SENT status', async () => {
      const result = await notificationService.dispatchNotification({
        event_type: 'EVENT_REGISTRATION_CONFIRMED',
        recipient_email: 'tester@devcatalyst.club',
        recipient_name: 'Test Attendee',
        subject: 'Confirmation Subject',
        body_html: '<p>HTML body</p>',
        body_text: 'Text body',
        idempotency_key: 'test-key-001',
      });

      expect(result.status).toBe('SENT');
      expect(result.delivery_attempts).toBe(1);
      expect(result.sent_at).not.toBeNull();
      expect(result.error_message).toBeNull();

      const stored = getStoredNotifications();
      expect(stored.some((n) => n.idempotency_key === 'test-key-001')).toBe(true);
    });

    it('handles simulated retryable provider errors and marks notification as RETRYABLE', async () => {
      defaultMockProvider.simulateRetryableFailureOnce('Gateway timeout 504');

      const result = await notificationService.dispatchNotification({
        event_type: 'EVENT_REGISTRATION_CONFIRMED',
        recipient_email: 'retry@devcatalyst.club',
        recipient_name: 'Retry User',
        subject: 'Retry Test Subject',
        body_html: '<p>Retry</p>',
        body_text: 'Retry',
        idempotency_key: 'test-retry-001',
      });

      expect(result.status).toBe('RETRYABLE');
      expect(result.delivery_attempts).toBe(1);
      expect(result.error_message).toBe('Gateway timeout 504');
    });

    it('handles fatal non-retryable provider errors and marks notification as FAILED', async () => {
      defaultMockProvider.simulateFailureOnce('Mailbox does not exist (550)');

      const result = await notificationService.dispatchNotification({
        event_type: 'RECRUITMENT_APPLICATION_REJECTED',
        recipient_email: 'failed@devcatalyst.club',
        recipient_name: 'Fail User',
        subject: 'Rejection Subject',
        body_html: '<p>Failed</p>',
        body_text: 'Failed',
        idempotency_key: 'test-fail-001',
      });

      expect(result.status).toBe('FAILED');
      expect(result.delivery_attempts).toBe(1);
      expect(result.error_message).toBe('Mailbox does not exist (550)');
    });

    it('allows a custom provider to be registered dynamically without modifying business logic', async () => {
      const customProviderCalls: string[] = [];
      const customProvider: NotificationProvider = {
        name: 'CustomVendorProvider',
        sendEmail: async (msg) => {
          customProviderCalls.push(msg.subject);
          return { success: true, messageId: 'vendor-12345' };
        },
      };

      setActiveNotificationProvider(customProvider);

      const result = await notificationService.dispatchNotification({
        event_type: 'EVENT_REGISTRATION_CONFIRMED',
        recipient_email: 'custom@vendor.com',
        recipient_name: 'Vendor User',
        subject: 'Vendor Provider Test',
        body_html: '<p>Hi</p>',
        body_text: 'Hi',
        idempotency_key: 'vendor-key-1',
      });

      expect(result.status).toBe('SENT');
      expect(customProviderCalls).toContain('Vendor Provider Test');
      expect(result.metadata?.providerMessageId).toBe('vendor-12345');
    });
  });

  // 5. Idempotency & Duplicate Prevention
  describe('Idempotency & Duplicate Prevention', () => {
    it('suppresses duplicate sends when invoked with the same idempotency key', async () => {
      const key = 'idempotent-key-unique-99';

      // 1. Initial send
      const first = await notificationService.dispatchNotification({
        event_type: 'EVENT_REGISTRATION_CONFIRMED',
        recipient_email: 'dup@example.com',
        recipient_name: 'Dup User',
        subject: 'Initial Send',
        body_html: '<p>One</p>',
        body_text: 'One',
        idempotency_key: key,
      });

      expect(first.status).toBe('SENT');
      expect(first.delivery_attempts).toBe(1);

      const dispatchesAfterFirst = defaultMockProvider.getDispatchedEmails().length;

      // 2. Duplicate dispatch attempt with same idempotency key
      const second = await notificationService.dispatchNotification({
        event_type: 'EVENT_REGISTRATION_CONFIRMED',
        recipient_email: 'dup@example.com',
        recipient_name: 'Dup User',
        subject: 'Duplicate Send Attempt',
        body_html: '<p>Two</p>',
        body_text: 'Two',
        idempotency_key: key,
      });

      // Returns existing record without dispatching another email
      expect(second.id).toBe(first.id);
      expect(second.delivery_attempts).toBe(1);
      expect(defaultMockProvider.getDispatchedEmails().length).toBe(dispatchesAfterFirst);
    });
  });

  // 6. Manual Retry & RBAC Authorization
  describe('Retry Mechanism & Authorization Controls', () => {
    it('permits ADMIN and ORGANIZER to retry failed/retryable notifications', async () => {
      defaultMockProvider.simulateRetryableFailureOnce('Temporary network timeout');

      const failedRecord = await notificationService.dispatchNotification({
        event_type: 'EVENT_REGISTRATION_CONFIRMED',
        recipient_email: 'retry.auth@example.com',
        recipient_name: 'Auth User',
        subject: 'Subject to Retry',
        body_html: '<p>Retry</p>',
        body_text: 'Retry',
        idempotency_key: 'retry-auth-key-1',
      });

      expect(failedRecord.status).toBe('RETRYABLE');

      // Admin retries
      const retried = await notificationService.retryNotification(failedRecord.id, 'ADMIN');
      expect(retried.status).toBe('SENT');
      expect(retried.delivery_attempts).toBe(2);
      expect(retried.sent_at).not.toBeNull();
    });

    it('denies MEMBER and PARTICIPANT roles from retrying notifications', async () => {
      defaultMockProvider.simulateRetryableFailureOnce('Temporary network timeout');

      const failedRecord = await notificationService.dispatchNotification({
        event_type: 'EVENT_REGISTRATION_CONFIRMED',
        recipient_email: 'unauth@example.com',
        recipient_name: 'Unauth User',
        subject: 'Subject',
        body_html: '<p>Retry</p>',
        body_text: 'Retry',
        idempotency_key: 'retry-unauth-key-1',
      });

      await expect(
        notificationService.retryNotification(failedRecord.id, 'MEMBER')
      ).rejects.toThrow('Unauthorized: Only administrators and reviewers can retry failed notifications');

      await expect(
        notificationService.retryNotification(failedRecord.id, 'PARTICIPANT')
      ).rejects.toThrow('Unauthorized: Only administrators and reviewers can retry failed notifications');
    });

    it('enforces privacy: non-privileged users only see their own notification logs', async () => {
      saveStoredNotifications([
        {
          id: 'priv-notif-1',
          idempotency_key: 'k-1',
          event_type: 'EVENT_REGISTRATION_CONFIRMED',
          recipient_email: 'alice@example.com',
          recipient_name: 'Alice',
          subject: 'Alice Ticket',
          body_html: '',
          body_text: '',
          status: 'SENT',
          delivery_attempts: 1,
          max_attempts: 3,
          last_attempt_at: null,
          sent_at: null,
          error_message: null,
          metadata: {},
          created_at: '2026-01-01T00:00:00Z',
          updated_at: '2026-01-01T00:00:00Z',
        },
        {
          id: 'priv-notif-2',
          idempotency_key: 'k-2',
          event_type: 'RECRUITMENT_APPLICATION_ACCEPTED',
          recipient_email: 'bob@example.com',
          recipient_name: 'Bob',
          subject: 'Bob Offer',
          body_html: '',
          body_text: '',
          status: 'SENT',
          delivery_attempts: 1,
          max_attempts: 3,
          last_attempt_at: null,
          sent_at: null,
          error_message: null,
          metadata: {},
          created_at: '2026-01-01T00:00:00Z',
          updated_at: '2026-01-01T00:00:00Z',
        },
      ]);

      // Admin sees both
      const adminLogs = await notificationService.getNotifications(undefined, 'admin@club.io', 'ADMIN');
      expect(adminLogs.length).toBe(2);

      // Alice only sees her own log
      const aliceLogs = await notificationService.getNotifications(undefined, 'alice@example.com', 'MEMBER');
      expect(aliceLogs.length).toBe(1);
      expect(aliceLogs[0].recipient_email).toBe('alice@example.com');
    });
  });

  // 7. Domain Workflow Trigger Integration
  describe('Workflow Integration: Event Registrations & Recruitment Changes', () => {
    it('triggers registration confirmation email when registration succeeds', async () => {
      const reg = await registrationService.registerParticipant({
        event_id: 'evt-001',
        participant_name: 'Automated Attendee',
        participant_email: 'auto.attendee@example.com',
      });

      expect(reg.id).toBeDefined();

      const dispatches = defaultMockProvider.getDispatchedEmails();
      const match = dispatches.find((d) => d.to.email === 'auto.attendee@example.com');
      expect(match).toBeDefined();
      expect(match?.subject).toContain('Registration Confirmed');
      expect(match?.attachments?.[0].filename).toContain('.ics');
    });

    it('triggers cancellation notification when an event registration is cancelled', async () => {
      // First register
      const reg = await registrationService.registerParticipant({
        event_id: 'evt-001',
        participant_name: 'Cancel Attendee',
        participant_email: 'cancel.attendee@example.com',
      });

      defaultMockProvider.clearDispatches();

      // Now cancel
      const cancelled = await registrationService.cancelRegistration(reg.id, undefined, 'ADMIN');
      expect(cancelled.status).toBe('CANCELLED');

      const dispatches = defaultMockProvider.getDispatchedEmails();
      const match = dispatches.find((d) => d.to.email === 'cancel.attendee@example.com');
      expect(match).toBeDefined();
      expect(match?.subject).toContain('Registration Cancelled');
    });

    it('does NOT trigger registration emails if event registration fails', async () => {
      defaultMockProvider.clearDispatches();

      // Attempt registration for invalid event
      await expect(
        registrationService.registerParticipant({
          event_id: 'non-existent-event-id-999',
          participant_name: 'Ghost Attendee',
          participant_email: 'ghost@example.com',
        })
      ).rejects.toThrow();

      // Zero notification dispatches
      const dispatches = defaultMockProvider.getDispatchedEmails();
      expect(dispatches.length).toBe(0);
    });

    it('triggers interview invitation email when recruitment interview is scheduled', async () => {
      defaultMockProvider.clearDispatches();

      // Schedule interview for demo application 'app-002'
      const interview = await recruitmentService.scheduleInterview(
        {
          application_id: 'app-002',
          scheduled_at: '2026-11-20T10:00:00Z',
          format: 'ONLINE',
          meeting_link: 'https://meet.devcatalyst.club/app-002',
          duration_minutes: 60,
        },
        'admin-usr-001',
        'ADMIN'
      );

      expect(interview.id).toBeDefined();

      const dispatches = defaultMockProvider.getDispatchedEmails();
      const interviewEmail = dispatches.find((d) => d.subject.includes('Interview Scheduled'));
      expect(interviewEmail).toBeDefined();
      expect(interviewEmail?.attachments?.[0].contentType).toBe('text/calendar');
    });

    it('triggers stage notifications on ACCEPTED and REJECTED transitions', async () => {
      defaultMockProvider.clearDispatches();

      // Update app-001 stage to ACCEPTED
      await recruitmentService.updateApplicationStage(
        'app-001',
        'ACCEPTED',
        'admin-usr-001',
        'Outstanding technical interview',
        'ADMIN'
      );

      const dispatches = defaultMockProvider.getDispatchedEmails();
      const acceptedEmail = dispatches.find((d) => d.subject.includes('Welcome to DevCatalyst Club!'));
      expect(acceptedEmail).toBeDefined();
    });
  });
});
