import { insforge, isInsForgeConfigured } from '../lib/insforge';
import type { Role } from '../types/auth';
import type {
  AttendanceRecord,
  CheckInResult,
  CheckInMethod,
  Registration,
} from '../types/database';
import {
  getStoredRegistrations,
  saveStoredRegistrations,
} from './registrationService';

const LOCAL_STORAGE_ATTENDANCE_KEY = 'devcatalyst_hub_attendance';

export const INITIAL_DEMO_ATTENDANCE: AttendanceRecord[] = [
  {
    id: 'att-001',
    event_id: 'evt-004',
    registration_id: 'reg-004',
    checked_in_at: '2026-01-20T10:15:00Z',
    checked_in_by: 'lead-usr-002',
    method: 'QR_SCAN',
    notes: 'Checked in at main entrance.',
  },
];

export function getStoredAttendance(): AttendanceRecord[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_ATTENDANCE_KEY);
    if (!raw) {
      localStorage.setItem(LOCAL_STORAGE_ATTENDANCE_KEY, JSON.stringify(INITIAL_DEMO_ATTENDANCE));
      return INITIAL_DEMO_ATTENDANCE;
    }
    return JSON.parse(raw);
  } catch {
    return INITIAL_DEMO_ATTENDANCE;
  }
}

export function saveStoredAttendance(records: AttendanceRecord[]) {
  try {
    localStorage.setItem(LOCAL_STORAGE_ATTENDANCE_KEY, JSON.stringify(records));
  } catch (err) {
    console.error('Failed to save attendance to localStorage', err);
  }
}

export const attendanceService = {
  /**
   * Verify and check in ticket server-side or via atomic local store
   */
  async verifyAndCheckInTicket(
    eventId: string,
    ticketIdentifier: string,
    checkedInByUserId?: string,
    method: CheckInMethod = 'QR_SCAN',
    notes?: string
  ): Promise<CheckInResult> {
    if (!checkedInByUserId) {
      throw new Error('Unauthorized: Must be authenticated to verify and check in tickets');
    }

    const cleanIdent = ticketIdentifier.trim();
    if (!cleanIdent) {
      return {
        success: false,
        code: 'INVALID_TICKET',
        message: 'Ticket identifier cannot be empty',
      };
    }

    if (isInsForgeConfigured) {
      try {
        const { data, error } = await insforge.database.rpc('verify_and_checkin_ticket', {
          p_event_id: eventId,
          p_ticket_identifier: cleanIdent,
          p_checked_in_by: checkedInByUserId || null,
          p_method: method,
          p_notes: notes || null,
        });

        if (error) throw new Error(error.message);
        return data as CheckInResult;
      } catch (err: unknown) {
        console.warn('InsForge remote verify_and_checkin_ticket failed, falling back locally:', (err as Error).message);
      }
    }

    // Local / verification flow
    const registrations = getStoredRegistrations();
    const reg = registrations.find(
      (r) => r.ticket_token === cleanIdent || r.ticket_code.toLowerCase() === cleanIdent.toLowerCase()
    );

    if (!reg) {
      return {
        success: false,
        code: 'INVALID_TICKET',
        message: 'Invalid ticket. No matching registration found.',
      };
    }

    if (reg.event_id !== eventId) {
      return {
        success: false,
        code: 'WRONG_EVENT',
        message: 'This ticket is registered for a different event.',
        registration: reg,
      };
    }

    if (reg.status === 'CANCELLED') {
      return {
        success: false,
        code: 'REGISTRATION_CANCELLED',
        message: 'This registration has been cancelled.',
        registration: reg,
      };
    }

    const attendanceRecords = getStoredAttendance();
    const existing = attendanceRecords.find((a) => a.registration_id === reg.id);
    if (existing) {
      return {
        success: false,
        code: 'ALREADY_CHECKED_IN',
        message: `Already checked in at ${new Date(existing.checked_in_at).toLocaleTimeString()}`,
        registration: reg,
        attendance: existing,
      };
    }

    const newAttendance: AttendanceRecord = {
      id: `att-${Date.now()}`,
      event_id: eventId,
      registration_id: reg.id,
      checked_in_at: new Date().toISOString(),
      checked_in_by: checkedInByUserId || null,
      method,
      notes: notes || null,
    };

    attendanceRecords.push(newAttendance);
    saveStoredAttendance(attendanceRecords);

    // Update registration status to ATTENDED
    const regIndex = registrations.findIndex((r) => r.id === reg.id);
    if (regIndex !== -1) {
      registrations[regIndex].status = 'ATTENDED';
      registrations[regIndex].updated_at = new Date().toISOString();
      saveStoredRegistrations(registrations);
    }

    return {
      success: true,
      code: 'CHECKED_IN',
      message: `Successfully checked in ${reg.participant_name}`,
      registration: { ...reg, status: 'ATTENDED' },
      attendance: newAttendance,
    };
  },

  /**
   * Get attendance list for an event
   */
  async getEventAttendance(
    eventId: string,
    _currentUserId?: string,
    userRole?: Role
  ): Promise<(AttendanceRecord & { registration?: Registration })[]> {
    const isPrivileged = userRole === 'ADMIN' || userRole === 'ORGANIZER';
    if (!isPrivileged) {
      throw new Error('Unauthorized: Only organizers can view event attendance records');
    }

    if (isInsForgeConfigured) {
      try {
        const { data, error } = await insforge.database
          .from('attendance')
          .select('*, registration:registrations(*), checked_in_by_profile:profiles!checked_in_by(*)')
          .eq('event_id', eventId)
          .order('checked_in_at', { ascending: false });

        if (error) throw new Error(error.message);
        return data || [];
      } catch (err: unknown) {
        console.warn('InsForge remote getEventAttendance failed:', (err as Error).message);
      }
    }

    const attendanceRecords = getStoredAttendance();
    const registrations = getStoredRegistrations();

    const eventAttendance = attendanceRecords
      .filter((a) => a.event_id === eventId)
      .map((a) => {
        const r = registrations.find((reg) => reg.id === a.registration_id);
        return {
          ...a,
          registration: r,
        };
      });

    return eventAttendance.sort(
      (a, b) => new Date(b.checked_in_at).getTime() - new Date(a.checked_in_at).getTime()
    );
  },

  /**
   * Manual check-in helper for staff using the roster table
   */
  async manualCheckIn(
    eventId: string,
    registrationId: string,
    checkedInByUserId?: string,
    notes?: string
  ): Promise<CheckInResult> {
    const registrations = getStoredRegistrations();
    const reg = registrations.find((r) => r.id === registrationId);
    if (!reg) {
      return {
        success: false,
        code: 'INVALID_TICKET',
        message: 'Registration record not found',
      };
    }

    return this.verifyAndCheckInTicket(
      eventId,
      reg.ticket_code,
      checkedInByUserId,
      'MANUAL',
      notes
    );
  },
};
