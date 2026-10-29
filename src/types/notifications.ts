import type { ApplicationStage, ClubDomain, EventFormat } from './database';

export type NotificationEventType =
  | 'EVENT_REGISTRATION_CONFIRMED'
  | 'EVENT_REGISTRATION_CANCELLED'
  | 'RECRUITMENT_INTERVIEW_SCHEDULED'
  | 'RECRUITMENT_STAGE_ADVANCED'
  | 'RECRUITMENT_APPLICATION_ACCEPTED'
  | 'RECRUITMENT_APPLICATION_REJECTED';

export type NotificationStatus = 'PENDING' | 'SENT' | 'FAILED' | 'RETRYABLE';

export interface EventRegistrationNotificationPayload {
  registration_id: string;
  event_id: string;
  event_title: string;
  start_time: string;
  end_time: string;
  format: EventFormat;
  venue_or_link: string;
  ticket_code: string;
  ticket_token: string;
  participant_name: string;
  participant_email: string;
  calendar_ics?: string;
}

export interface EventCancellationNotificationPayload {
  registration_id: string;
  event_id: string;
  event_title: string;
  participant_name: string;
  participant_email: string;
  cancelled_at: string;
}

export interface RecruitmentInterviewNotificationPayload {
  application_id: string;
  reference_code: string;
  applicant_name: string;
  applicant_email: string;
  domain: ClubDomain;
  interview_id: string;
  scheduled_at: string;
  time_zone: string;
  duration_minutes: number;
  format: 'ONLINE' | 'IN_PERSON';
  meeting_link?: string | null;
  location?: string | null;
  calendar_ics?: string;
}

export interface RecruitmentStageNotificationPayload {
  application_id: string;
  reference_code: string;
  applicant_name: string;
  applicant_email: string;
  domain: ClubDomain;
  new_stage: ApplicationStage;
  previous_stage?: ApplicationStage | null;
  decision_rationale?: string | null;
}

export type NotificationPayload =
  | EventRegistrationNotificationPayload
  | EventCancellationNotificationPayload
  | RecruitmentInterviewNotificationPayload
  | RecruitmentStageNotificationPayload;

export interface NotificationRecord {
  id: string;
  idempotency_key: string;
  event_type: NotificationEventType;
  recipient_email: string;
  recipient_name: string;
  subject: string;
  body_html: string;
  body_text: string;
  status: NotificationStatus;
  delivery_attempts: number;
  max_attempts: number;
  last_attempt_at: string | null;
  sent_at: string | null;
  error_message: string | null;
  metadata?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface EmailMessage {
  to: { email: string; name?: string };
  from?: { email: string; name?: string };
  subject: string;
  html: string;
  text: string;
  idempotencyKey?: string;
  attachments?: Array<{
    filename: string;
    content: string;
    contentType: string;
  }>;
}

export interface SendEmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
  isRetryable?: boolean;
}
