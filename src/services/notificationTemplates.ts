/**
 * DevCatalyst Hub — Notification Templates & Anti-Injection Engine
 * Branded HTML and plaintext notification templates with strict content sanitization.
 */

import type {
  EventRegistrationNotificationPayload,
  EventCancellationNotificationPayload,
  RecruitmentInterviewNotificationPayload,
  RecruitmentStageNotificationPayload,
} from '../types/notifications';

/**
 * Escape HTML special characters to prevent HTML/XSS injection in email clients
 */
export function escapeHtml(unsafe: string): string {
  if (!unsafe) return '';
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Sanitize email subject lines and header values to prevent CRLF injection (header injection)
 */
export function sanitizeEmailHeader(value: string): string {
  if (!value) return '';
  return value.replace(/[\r\n\t]+/g, ' ').trim();
}

/**
 * Base email layout wrapper with cohesive DevCatalyst brand tokens
 */
function wrapHtmlLayout(title: string, bodyContent: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #FAFAFA; color: #171717; margin: 0; padding: 0; line-height: 1.5; }
    .container { max-width: 600px; margin: 24px auto; background-color: #FFFFFF; border: 1px solid #E5E5E5; border-radius: 16px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.05); }
    .header { background-color: #090909; padding: 24px 32px; border-bottom: 2px solid #262626; }
    .logo-badge { display: inline-block; background-color: #171717; color: #FFFFFF; font-weight: 800; font-size: 14px; padding: 4px 10px; border-radius: 6px; letter-spacing: 0.05em; border: 1px solid #262626; }
    .header-title { color: #FFFFFF; font-size: 18px; font-weight: 700; margin: 12px 0 0 0; }
    .content { padding: 32px; }
    .card { background-color: #FAFAFA; border: 1px solid #E5E5E5; border-radius: 12px; padding: 20px; margin: 20px 0; }
    .ticket-code { display: inline-block; font-family: monospace; font-size: 18px; font-weight: 800; color: #090909; background-color: #F5F5F5; border: 1px dashed #737373; padding: 6px 14px; border-radius: 8px; letter-spacing: 0.1em; }
    .detail-row { margin: 8px 0; font-size: 13px; }
    .detail-label { color: #737373; font-weight: 600; width: 120px; display: inline-block; }
    .detail-value { color: #171717; font-weight: 600; }
    .footer { background-color: #FAFAFA; padding: 20px 32px; text-align: center; font-size: 11px; color: #737373; border-top: 1px solid #E5E5E5; }
    .cta-button { display: inline-block; background-color: #090909; color: #FFFFFF !important; font-weight: 600; font-size: 14px; text-decoration: none; padding: 10px 22px; border-radius: 8px; margin-top: 16px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <span class="logo-badge">DEVCATALYST HUB</span>
      <h1 class="header-title">${escapeHtml(title)}</h1>
    </div>
    <div class="content">
      ${bodyContent}
    </div>
    <div class="footer">
      <p>DevCatalyst Student Developer Club &bull; High-Impact Technical Initiatives</p>
      <p>This automated message was dispatched by the DevCatalyst Hub event automation engine.</p>
    </div>
  </div>
</body>
</html>`;
}

// -----------------------------------------------------------------------------
// 1. Event Registration Confirmation Template
// -----------------------------------------------------------------------------
export function renderEventRegistrationEmail(payload: EventRegistrationNotificationPayload): {
  subject: string;
  html: string;
  text: string;
} {
  const safeName = escapeHtml(payload.participant_name);
  const safeTitle = escapeHtml(payload.event_title);
  const safeVenue = escapeHtml(payload.venue_or_link);
  const safeCode = escapeHtml(payload.ticket_code);

  const startDate = new Date(payload.start_time).toLocaleString('en-US', {
    dateStyle: 'full',
    timeStyle: 'short',
  });

  const subject = sanitizeEmailHeader(
    `Registration Confirmed: ${payload.event_title} [Ticket ${payload.ticket_code}]`
  );

  const html = wrapHtmlLayout(
    'Registration Confirmed',
    `
      <p>Hello <strong>${safeName}</strong>,</p>
      <p>Your enrollment for <strong>${safeTitle}</strong> has been confirmed. Below is your official entrance pass and details.</p>
      
      <div class="card">
        <div style="text-align: center; margin-bottom: 16px;">
          <span style="font-size: 11px; text-transform: uppercase; color: #64748B; font-weight: 700; letter-spacing: 0.05em; display: block; margin-bottom: 6px;">Your Official Ticket Code</span>
          <span class="ticket-code">${safeCode}</span>
        </div>
        
        <div class="detail-row">
          <span class="detail-label">Event:</span>
          <span class="detail-value">${safeTitle}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Date & Time:</span>
          <span class="detail-value">${escapeHtml(startDate)}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Format:</span>
          <span class="detail-value">${escapeHtml(payload.format)}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Location / Link:</span>
          <span class="detail-value">${safeVenue}</span>
        </div>
      </div>

      <p style="font-size: 13px; color: #475569;">
        Please present this ticket code or access your digital QR pass in DevCatalyst Hub when checking in at the venue.
      </p>
    `
  );

  const text = `Hello ${payload.participant_name},

Your registration for ${payload.event_title} is confirmed.

Ticket Code: ${payload.ticket_code}
Event: ${payload.event_title}
Date & Time: ${startDate}
Format: ${payload.format}
Location / Link: ${payload.venue_or_link}

Present this ticket code at check-in.

— DevCatalyst Hub Event Operations`;

  return { subject, html, text };
}

// -----------------------------------------------------------------------------
// 2. Event Registration Cancellation Template
// -----------------------------------------------------------------------------
export function renderEventCancellationEmail(payload: EventCancellationNotificationPayload): {
  subject: string;
  html: string;
  text: string;
} {
  const safeName = escapeHtml(payload.participant_name);
  const safeTitle = escapeHtml(payload.event_title);

  const subject = sanitizeEmailHeader(`Registration Cancelled: ${payload.event_title}`);

  const html = wrapHtmlLayout(
    'Registration Cancelled',
    `
      <p>Hello <strong>${safeName}</strong>,</p>
      <p>Your registration for <strong>${safeTitle}</strong> has been cancelled as requested.</p>
      <div class="card">
        <p style="margin: 0; font-size: 13px; color: #64748B;">
          Your seat has been released back to the event capacity pool. If this was done in error, you may re-register through DevCatalyst Hub as long as seats remain available.
        </p>
      </div>
    `
  );

  const text = `Hello ${payload.participant_name},

Your registration for ${payload.event_title} has been cancelled. Your seat has been released.
If this was in error, you may re-register via DevCatalyst Hub if seats remain available.

— DevCatalyst Hub Operations`;

  return { subject, html, text };
}

// -----------------------------------------------------------------------------
// 3. Recruitment Interview Scheduled Template
// -----------------------------------------------------------------------------
export function renderInterviewScheduledEmail(payload: RecruitmentInterviewNotificationPayload): {
  subject: string;
  html: string;
  text: string;
} {
  const safeName = escapeHtml(payload.applicant_name);
  const safeRef = escapeHtml(payload.reference_code);
  const safeDomain = escapeHtml(payload.domain);
  const safeLink = escapeHtml(payload.meeting_link || payload.location || 'Meeting link provided in workspace');

  const schedDate = new Date(payload.scheduled_at).toLocaleString('en-US', {
    dateStyle: 'full',
    timeStyle: 'short',
    timeZone: payload.time_zone || 'UTC',
  });

  const subject = sanitizeEmailHeader(
    `Interview Scheduled: DevCatalyst Club [Ref ${payload.reference_code}]`
  );

  const html = wrapHtmlLayout(
    'Interview Scheduled',
    `
      <p>Hello <strong>${safeName}</strong>,</p>
      <p>Congratulations! Your application for the <strong>${safeDomain}</strong> domain has advanced to the evaluation round.</p>
      
      <div class="card">
        <div style="text-align: center; margin-bottom: 16px;">
          <span style="font-size: 11px; text-transform: uppercase; color: #64748B; font-weight: 700; letter-spacing: 0.05em; display: block; margin-bottom: 6px;">Application Reference</span>
          <span class="ticket-code">${safeRef}</span>
        </div>

        <div class="detail-row">
          <span class="detail-label">Domain:</span>
          <span class="detail-value">${safeDomain}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Interview Time:</span>
          <span class="detail-value">${escapeHtml(schedDate)} (${escapeHtml(payload.time_zone)})</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Duration:</span>
          <span class="detail-value">${payload.duration_minutes} minutes</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Format:</span>
          <span class="detail-value">${escapeHtml(payload.format)}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Meeting Access:</span>
          <span class="detail-value">${safeLink}</span>
        </div>
      </div>

      <h4 style="font-size: 13px; color: #0F172A; margin: 16px 0 8px 0;">Preparation Guidelines:</h4>
      <ul style="font-size: 12px; color: #475569; padding-left: 20px; line-height: 1.6;">
        <li>Review your submitted experience and flagship projects.</li>
        <li>Be prepared to discuss technical trade-offs, architecture decisions, and collaborative teamwork.</li>
        <li>Have a stable connection and quiet environment ready 5 minutes prior to start.</li>
      </ul>
    `
  );

  const text = `Hello ${payload.applicant_name},

Congratulations! Your application for the ${payload.domain} domain has advanced to the interview stage.

Application Reference: ${payload.reference_code}
Domain: ${payload.domain}
Scheduled Time: ${schedDate} (${payload.time_zone})
Duration: ${payload.duration_minutes} minutes
Format: ${payload.format}
Access: ${payload.meeting_link || payload.location || 'See workspace'}

Preparation Guidelines:
- Review your submitted projects and experience.
- Be prepared to discuss technical architecture and collaboration.

— DevCatalyst Club Recruitment Committee`;

  return { subject, html, text };
}

// -----------------------------------------------------------------------------
// 4. Recruitment Stage Update: Acceptance Template
// -----------------------------------------------------------------------------
export function renderCandidateAcceptedEmail(payload: RecruitmentStageNotificationPayload): {
  subject: string;
  html: string;
  text: string;
} {
  const safeName = escapeHtml(payload.applicant_name);
  const safeRef = escapeHtml(payload.reference_code);
  const safeDomain = escapeHtml(payload.domain);

  const subject = sanitizeEmailHeader(
    `Welcome to DevCatalyst Club! [Ref ${payload.reference_code}]`
  );

  const html = wrapHtmlLayout(
    'Welcome to DevCatalyst Club!',
    `
      <p>Hello <strong>${safeName}</strong>,</p>
      <p>On behalf of the entire club leadership, we are thrilled to offer you membership in <strong>DevCatalyst Club</strong> for the <strong>${safeDomain}</strong> domain!</p>
      
      <div class="card" style="border-left: 4px solid #10B981;">
        <div class="detail-row">
          <span class="detail-label">Reference Code:</span>
          <span class="detail-value">${safeRef}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Domain:</span>
          <span class="detail-value">${safeDomain}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Status:</span>
          <span class="detail-value" style="color: #10B981;">ACCEPTED</span>
        </div>
      </div>

      <p style="font-size: 13px; color: #334155;">
        Our team was thoroughly impressed with your technical competency, drive, and vision for collaborative software engineering.
      </p>

      <p style="font-size: 13px; color: #475569;">
        Your club account and team onboarding credentials will be provisioned shortly. Keep an eye on your inbox for onboarding schedule details.
      </p>
    `
  );

  const text = `Hello ${payload.applicant_name},

Congratulations! We are thrilled to offer you membership in DevCatalyst Club for the ${payload.domain} domain!

Reference Code: ${payload.reference_code}
Domain: ${payload.domain}
Status: ACCEPTED

Your club onboarding instructions and workspace access will follow shortly.

— DevCatalyst Club Leadership`;

  return { subject, html, text };
}

// -----------------------------------------------------------------------------
// 5. Recruitment Stage Update: Rejection Template
// -----------------------------------------------------------------------------
export function renderCandidateRejectedEmail(payload: RecruitmentStageNotificationPayload): {
  subject: string;
  html: string;
  text: string;
} {
  const safeName = escapeHtml(payload.applicant_name);
  const safeRef = escapeHtml(payload.reference_code);
  const safeDomain = escapeHtml(payload.domain);

  const subject = sanitizeEmailHeader(
    `DevCatalyst Club Application Update [Ref ${payload.reference_code}]`
  );

  const html = wrapHtmlLayout(
    'Application Status Update',
    `
      <p>Hello <strong>${safeName}</strong>,</p>
      <p>Thank you for taking the time to apply to <strong>DevCatalyst Club</strong> for the <strong>${safeDomain}</strong> domain (Reference: <code>${safeRef}</code>).</p>
      
      <div class="card">
        <p style="margin: 0; font-size: 13px; color: #475569; line-height: 1.6;">
          After careful consideration across this recruitment cycle's candidate pool, we are unable to offer you a position at this time.
        </p>
      </div>

      <p style="font-size: 13px; color: #475569;">
        We received a record number of high-caliber applications and had to make difficult selections based on current team initiatives. We encourage you to participate in our public workshops and hackathons, and re-apply in future recruitment cycles.
      </p>
    `
  );

  const text = `Hello ${payload.applicant_name},

Thank you for applying to DevCatalyst Club for the ${payload.domain} domain (Reference: ${payload.reference_code}).

After careful evaluation, we are unable to offer you a position for this cycle. We appreciate your interest and encourage you to participate in our upcoming open workshops and re-apply in future cycles.

— DevCatalyst Club Recruitment Committee`;

  return { subject, html, text };
}
