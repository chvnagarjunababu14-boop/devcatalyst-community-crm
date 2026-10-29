/**
 * DevCatalyst Hub — Notification & Event Automation Service
 * Handles reliable, idempotent notification dispatching, delivery tracking, and retries.
 */

import type { Role } from '../types/auth';
import type { Registration, EventItem, Application, Interview, ApplicationStage } from '../types/database';
import type {
  NotificationEventType,
  NotificationRecord,
  NotificationStatus,
} from '../types/notifications';
import { getActiveNotificationProvider } from './notificationProvider';
import {
  renderEventRegistrationEmail,
  renderEventCancellationEmail,
  renderInterviewScheduledEmail,
  renderCandidateAcceptedEmail,
  renderCandidateRejectedEmail,
} from './notificationTemplates';
import { generateIcsContent } from '../utils/calendar';

const LOCAL_STORAGE_NOTIFICATIONS_KEY = 'devcatalyst_hub_notifications';

export const INITIAL_DEMO_NOTIFICATIONS: NotificationRecord[] = [
  {
    id: 'notif-001',
    idempotency_key: 'evt-reg-reg-001',
    event_type: 'EVENT_REGISTRATION_CONFIRMED',
    recipient_email: 'marcus.member@devcatalyst.club',
    recipient_name: 'Marcus Vance',
    subject: 'Registration Confirmed: Cloud Architecture Summit 2026 [Ticket DC-TK-8A42F1]',
    body_html: '<p>Your registration for Cloud Architecture Summit 2026 is confirmed.</p>',
    body_text: 'Your registration for Cloud Architecture Summit 2026 is confirmed.',
    status: 'SENT',
    delivery_attempts: 1,
    max_attempts: 3,
    last_attempt_at: '2026-02-14T10:00:05Z',
    sent_at: '2026-02-14T10:00:05Z',
    error_message: null,
    metadata: {
      registration_id: 'reg-001',
      ticket_code: 'DC-TK-8A42F1',
    },
    created_at: '2026-02-14T10:00:00Z',
    updated_at: '2026-02-14T10:00:05Z',
  },
  {
    id: 'notif-002',
    idempotency_key: 'rec-stage-app-004-ACCEPTED',
    event_type: 'RECRUITMENT_APPLICATION_ACCEPTED',
    recipient_email: 'aisha.m@techhub.io',
    recipient_name: 'Aisha Al-Mansoor',
    subject: 'Welcome to DevCatalyst Club! [Ref APP-2026-2F4A7]',
    body_html: '<p>We are thrilled to offer you membership in DevCatalyst Club!</p>',
    body_text: 'We are thrilled to offer you membership in DevCatalyst Club!',
    status: 'SENT',
    delivery_attempts: 1,
    max_attempts: 3,
    last_attempt_at: '2026-10-18T15:30:10Z',
    sent_at: '2026-10-18T15:30:10Z',
    error_message: null,
    metadata: {
      application_id: 'app-004',
      reference_code: 'APP-2026-2F4A7',
    },
    created_at: '2026-10-18T15:30:00Z',
    updated_at: '2026-10-18T15:30:10Z',
  },
];

export function getStoredNotifications(): NotificationRecord[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_NOTIFICATIONS_KEY);
    if (!raw) {
      localStorage.setItem(
        LOCAL_STORAGE_NOTIFICATIONS_KEY,
        JSON.stringify(INITIAL_DEMO_NOTIFICATIONS)
      );
      return INITIAL_DEMO_NOTIFICATIONS;
    }
    return JSON.parse(raw);
  } catch {
    return INITIAL_DEMO_NOTIFICATIONS;
  }
}

export function saveStoredNotifications(records: NotificationRecord[]): void {
  try {
    localStorage.setItem(LOCAL_STORAGE_NOTIFICATIONS_KEY, JSON.stringify(records));
  } catch (err) {
    console.error('Failed to save notifications to localStorage', err);
  }
}

export interface DispatchParams {
  event_type: NotificationEventType;
  recipient_email: string;
  recipient_name: string;
  subject: string;
  body_html: string;
  body_text: string;
  idempotency_key: string;
  metadata?: Record<string, unknown>;
  attachments?: Array<{
    filename: string;
    content: string;
    contentType: string;
  }>;
}

export const notificationService = {
  /**
   * Core dispatch pipeline with strict idempotency and delivery attempt tracking
   */
  async dispatchNotification(params: DispatchParams): Promise<NotificationRecord> {
    const notifications = getStoredNotifications();

    // 1. Idempotency Check: Prevent duplicate sends for the same event key
    const existing = notifications.find((n) => n.idempotency_key === params.idempotency_key);
    if (existing) {
      if (existing.status === 'SENT' || existing.status === 'PENDING') {
        // Suppress duplicate send; return existing record
        return existing;
      }
    }

    const now = new Date().toISOString();
    const notificationId = existing?.id || `notif-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    const record: NotificationRecord = existing
      ? {
          ...existing,
          delivery_attempts: existing.delivery_attempts + 1,
          last_attempt_at: now,
          updated_at: now,
          status: 'PENDING',
          error_message: null,
        }
      : {
          id: notificationId,
          idempotency_key: params.idempotency_key,
          event_type: params.event_type,
          recipient_email: params.recipient_email,
          recipient_name: params.recipient_name,
          subject: params.subject,
          body_html: params.body_html,
          body_text: params.body_text,
          status: 'PENDING',
          delivery_attempts: 1,
          max_attempts: 3,
          last_attempt_at: now,
          sent_at: null,
          error_message: null,
          metadata: params.metadata || {},
          created_at: now,
          updated_at: now,
        };

    // Save initial pending state
    const index = notifications.findIndex((n) => n.id === notificationId);
    if (index !== -1) {
      notifications[index] = record;
    } else {
      notifications.unshift(record);
    }
    saveStoredNotifications(notifications);

    // 2. Invoke Configured Provider
    const provider = getActiveNotificationProvider();
    const result = await provider.sendEmail({
      to: { email: params.recipient_email, name: params.recipient_name },
      subject: params.subject,
      html: params.body_html,
      text: params.body_text,
      idempotencyKey: params.idempotency_key,
      attachments: params.attachments,
    });

    const completionTime = new Date().toISOString();

    // 3. Update Status Based on Delivery Result
    if (result.success) {
      record.status = 'SENT';
      record.sent_at = completionTime;
      record.updated_at = completionTime;
      record.error_message = null;
      if (result.messageId) {
        record.metadata = { ...record.metadata, providerMessageId: result.messageId };
      }
    } else {
      record.updated_at = completionTime;
      record.error_message = result.error || 'Unknown provider error';

      if (result.isRetryable && record.delivery_attempts < record.max_attempts) {
        record.status = 'RETRYABLE';
      } else {
        record.status = 'FAILED';
      }
    }

    // Persist final outcome
    const finalIndex = notifications.findIndex((n) => n.id === notificationId);
    if (finalIndex !== -1) {
      notifications[finalIndex] = record;
      saveStoredNotifications(notifications);
    }

    return record;
  },

  /**
   * Workflow Trigger 1: Event Registration Confirmation
   * Triggers strictly after registration succeeds in the data layer.
   */
  async sendEventRegistrationNotification(
    registration: Registration,
    event: EventItem
  ): Promise<NotificationRecord> {
    const icsContent = generateIcsContent({
      uid: `evt-${event.id}-${registration.id}`,
      title: event.title,
      description: `${event.description}\n\nTicket Code: ${registration.ticket_code}`,
      location: event.venue || event.meeting_link || undefined,
      startTime: event.start_time,
      endTime: event.end_time,
      organizerEmail: 'events@devcatalyst.club',
      organizerName: 'DevCatalyst Hub Events',
    });

    const { subject, html, text } = renderEventRegistrationEmail({
      registration_id: registration.id,
      event_id: event.id,
      event_title: event.title,
      start_time: event.start_time,
      end_time: event.end_time,
      format: event.format,
      venue_or_link: event.venue || event.meeting_link || 'Location TBA',
      ticket_code: registration.ticket_code,
      ticket_token: registration.ticket_token,
      participant_name: registration.participant_name,
      participant_email: registration.participant_email,
      calendar_ics: icsContent,
    });

    return this.dispatchNotification({
      event_type: 'EVENT_REGISTRATION_CONFIRMED',
      recipient_email: registration.participant_email,
      recipient_name: registration.participant_name,
      subject,
      body_html: html,
      body_text: text,
      idempotency_key: `evt-reg-${registration.id}`,
      metadata: {
        registration_id: registration.id,
        event_id: event.id,
        ticket_code: registration.ticket_code,
      },
      attachments: [
        {
          filename: `${event.title.replace(/[^a-zA-Z0-9]/g, '_')}.ics`,
          content: icsContent,
          contentType: 'text/calendar',
        },
      ],
    });
  },

  /**
   * Workflow Trigger 2: Event Registration Cancellation
   */
  async sendEventCancellationNotification(
    registration: Registration,
    event: EventItem
  ): Promise<NotificationRecord> {
    const { subject, html, text } = renderEventCancellationEmail({
      registration_id: registration.id,
      event_id: event.id,
      event_title: event.title,
      participant_name: registration.participant_name,
      participant_email: registration.participant_email,
      cancelled_at: new Date().toISOString(),
    });

    return this.dispatchNotification({
      event_type: 'EVENT_REGISTRATION_CANCELLED',
      recipient_email: registration.participant_email,
      recipient_name: registration.participant_name,
      subject,
      body_html: html,
      body_text: text,
      idempotency_key: `evt-cancel-${registration.id}`,
      metadata: {
        registration_id: registration.id,
        event_id: event.id,
      },
    });
  },

  /**
   * Workflow Trigger 3: Recruitment Candidate Interview Scheduled
   */
  async sendInterviewScheduledNotification(
    interview: Interview,
    application: Application
  ): Promise<NotificationRecord> {
    const durationMin = interview.duration_minutes || 45;
    const startTime = new Date(interview.scheduled_at);
    const endTime = new Date(startTime.getTime() + durationMin * 60000);

    const icsContent = generateIcsContent({
      uid: `interview-${interview.id}`,
      title: `DevCatalyst Interview: ${application.domain} Team (${application.applicant_name})`,
      description: `Evaluation session for DevCatalyst Club recruitment.\nReference: ${application.reference_code}\nCandidate: ${application.applicant_name}`,
      location: interview.meeting_link || interview.venue || undefined,
      startTime: startTime.toISOString(),
      endTime: endTime.toISOString(),
      organizerEmail: 'recruitment@devcatalyst.club',
      organizerName: 'DevCatalyst Recruitment Committee',
    });

    const { subject, html, text } = renderInterviewScheduledEmail({
      application_id: application.id,
      reference_code: application.reference_code,
      applicant_name: application.applicant_name,
      applicant_email: application.applicant_email,
      domain: application.domain,
      interview_id: interview.id,
      scheduled_at: interview.scheduled_at,
      time_zone: interview.time_zone || 'UTC',
      duration_minutes: durationMin,
      format: interview.format,
      meeting_link: interview.meeting_link,
      location: interview.venue || undefined,
      calendar_ics: icsContent,
    });

    return this.dispatchNotification({
      event_type: 'RECRUITMENT_INTERVIEW_SCHEDULED',
      recipient_email: application.applicant_email,
      recipient_name: application.applicant_name,
      subject,
      body_html: html,
      body_text: text,
      idempotency_key: `rec-interview-${interview.id}`,
      metadata: {
        application_id: application.id,
        reference_code: application.reference_code,
        interview_id: interview.id,
      },
      attachments: [
        {
          filename: `DevCatalyst_Interview_${application.reference_code}.ics`,
          content: icsContent,
          contentType: 'text/calendar',
        },
      ],
    });
  },

  /**
   * Workflow Trigger 4: Recruitment Stage Decision (Accepted or Rejected)
   */
  async sendRecruitmentStageNotification(
    application: Application,
    newStage: ApplicationStage,
    reason?: string | null
  ): Promise<NotificationRecord | null> {
    if (newStage === 'ACCEPTED') {
      const { subject, html, text } = renderCandidateAcceptedEmail({
        application_id: application.id,
        reference_code: application.reference_code,
        applicant_name: application.applicant_name,
        applicant_email: application.applicant_email,
        domain: application.domain,
        new_stage: newStage,
        previous_stage: application.stage,
        decision_rationale: reason,
      });

      return this.dispatchNotification({
        event_type: 'RECRUITMENT_APPLICATION_ACCEPTED',
        recipient_email: application.applicant_email,
        recipient_name: application.applicant_name,
        subject,
        body_html: html,
        body_text: text,
        idempotency_key: `rec-stage-${application.id}-ACCEPTED`,
        metadata: {
          application_id: application.id,
          reference_code: application.reference_code,
          stage: newStage,
        },
      });
    }

    if (newStage === 'REJECTED') {
      const { subject, html, text } = renderCandidateRejectedEmail({
        application_id: application.id,
        reference_code: application.reference_code,
        applicant_name: application.applicant_name,
        applicant_email: application.applicant_email,
        domain: application.domain,
        new_stage: newStage,
        previous_stage: application.stage,
        decision_rationale: reason,
      });

      return this.dispatchNotification({
        event_type: 'RECRUITMENT_APPLICATION_REJECTED',
        recipient_email: application.applicant_email,
        recipient_name: application.applicant_name,
        subject,
        body_html: html,
        body_text: text,
        idempotency_key: `rec-stage-${application.id}-REJECTED`,
        metadata: {
          application_id: application.id,
          reference_code: application.reference_code,
          stage: newStage,
        },
      });
    }

    return null;
  },

  /**
   * Manual Retry for Failed or Retryable Notifications (Restricted to Admin / Reviewer)
   */
  async retryNotification(notificationId: string, callerRole?: Role): Promise<NotificationRecord> {
    const isAuthorized = callerRole === 'ADMIN' || callerRole === 'ORGANIZER' || callerRole === 'PROJECT_LEAD';
    if (!isAuthorized) {
      throw new Error('Unauthorized: Only administrators and reviewers can retry failed notifications');
    }

    const notifications = getStoredNotifications();
    const record = notifications.find((n) => n.id === notificationId);
    if (!record) {
      throw new Error('Notification record not found');
    }

    if (record.status === 'SENT') {
      throw new Error('Cannot retry a notification that has already been successfully sent');
    }

    const now = new Date().toISOString();
    record.delivery_attempts += 1;
    record.last_attempt_at = now;
    record.status = 'PENDING';
    record.updated_at = now;
    saveStoredNotifications(notifications);

    const provider = getActiveNotificationProvider();
    const result = await provider.sendEmail({
      to: { email: record.recipient_email, name: record.recipient_name },
      subject: record.subject,
      html: record.body_html,
      text: record.body_text,
      idempotencyKey: record.idempotency_key,
    });

    const completionTime = new Date().toISOString();
    if (result.success) {
      record.status = 'SENT';
      record.sent_at = completionTime;
      record.updated_at = completionTime;
      record.error_message = null;
      if (result.messageId) {
        record.metadata = { ...record.metadata, providerMessageId: result.messageId };
      }
    } else {
      record.updated_at = completionTime;
      record.error_message = result.error || 'Retry failed';
      if (result.isRetryable && record.delivery_attempts < record.max_attempts) {
        record.status = 'RETRYABLE';
      } else {
        record.status = 'FAILED';
      }
    }

    const finalIndex = notifications.findIndex((n) => n.id === notificationId);
    if (finalIndex !== -1) {
      notifications[finalIndex] = record;
      saveStoredNotifications(notifications);
    }

    return record;
  },

  /**
   * Retrieve notification log records with role-based access filtering
   */
  async getNotifications(
    filters?: {
      status?: NotificationStatus;
      event_type?: NotificationEventType;
      search?: string;
    },
    currentCallerEmail?: string,
    callerRole?: Role
  ): Promise<NotificationRecord[]> {
    const isPrivileged = callerRole === 'ADMIN' || callerRole === 'ORGANIZER';
    const all = getStoredNotifications();

    return all.filter((n) => {
      // Role privacy: Non-admins can only see notifications addressed to them
      if (!isPrivileged) {
        if (!currentCallerEmail || n.recipient_email.toLowerCase() !== currentCallerEmail.toLowerCase()) {
          return false;
        }
      }

      if (filters?.status && n.status !== filters.status) return false;
      if (filters?.event_type && n.event_type !== filters.event_type) return false;

      if (filters?.search) {
        const q = filters.search.toLowerCase().trim();
        const matchRecip = n.recipient_email.toLowerCase().includes(q) || n.recipient_name.toLowerCase().includes(q);
        const matchSubj = n.subject.toLowerCase().includes(q);
        if (!matchRecip && !matchSubj) return false;
      }

      return true;
    });
  },
};
