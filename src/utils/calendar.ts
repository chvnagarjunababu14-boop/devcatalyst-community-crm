/**
 * RFC 5545 (iCalendar) Standards-Compliant Calendar Utility
 * DevCatalyst Hub — Event & Interview Calendar Automation
 */

export interface CalendarEventParams {
  uid: string;
  title: string;
  description: string;
  location?: string;
  startTime: string | Date;
  endTime: string | Date;
  organizerEmail?: string;
  organizerName?: string;
  url?: string;
}

/**
 * Format a Date or ISO string to UTC iCalendar format: YYYYMMDDTHHMMSSZ
 */
export function formatIcsDate(input: string | Date): string {
  const d = typeof input === 'string' ? new Date(input) : input;
  if (isNaN(d.getTime())) {
    throw new Error('Invalid date provided to formatIcsDate');
  }

  const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);

  const year = d.getUTCFullYear();
  const month = pad(d.getUTCMonth() + 1);
  const day = pad(d.getUTCDate());
  const hours = pad(d.getUTCHours());
  const minutes = pad(d.getUTCMinutes());
  const seconds = pad(d.getUTCSeconds());

  return `${year}${month}${day}T${hours}${minutes}${seconds}Z`;
}

/**
 * Escape special characters per RFC 5545 Section 3.3.11:
 * Backslashes, semicolons, commas, and newlines must be backslash-escaped.
 */
export function escapeIcsText(text: string): string {
  if (!text) return '';
  return text
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n');
}

/**
 * Generate a complete RFC 5545 VCALENDAR string
 */
export function generateIcsContent(params: CalendarEventParams): string {
  const dtStamp = formatIcsDate(new Date());
  const dtStart = formatIcsDate(params.startTime);
  const dtEnd = formatIcsDate(params.endTime);

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//DevCatalyst Hub//Event Automation//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:REQUEST',
    'BEGIN:VEVENT',
    `UID:${params.uid}@devcatalyst.club`,
    `DTSTAMP:${dtStamp}`,
    `DTSTART:${dtStart}`,
    `DTEND:${dtEnd}`,
    `SUMMARY:${escapeIcsText(params.title)}`,
    `DESCRIPTION:${escapeIcsText(params.description)}`,
  ];

  if (params.location) {
    lines.push(`LOCATION:${escapeIcsText(params.location)}`);
  }

  if (params.organizerEmail) {
    const orgName = params.organizerName ? `CN=${escapeIcsText(params.organizerName)}:` : ':';
    lines.push(`ORGANIZER;${orgName}mailto:${params.organizerEmail}`);
  }

  if (params.url) {
    lines.push(`URL:${params.url}`);
  }

  lines.push('STATUS:CONFIRMED');
  lines.push('TRANSP:OPAQUE');
  lines.push('END:VEVENT');
  lines.push('END:VCALENDAR');

  return lines.join('\r\n');
}

/**
 * Create a downloadable Blob object for an .ics calendar file
 */
export function createIcsBlob(icsContent: string): Blob {
  return new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
}

/**
 * Trigger client-side browser download of an .ics calendar file
 */
export function downloadIcsFile(filename: string, icsContent: string): void {
  const safeFilename = filename.endsWith('.ics') ? filename : `${filename}.ics`;
  const blob = createIcsBlob(icsContent);
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', safeFilename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
