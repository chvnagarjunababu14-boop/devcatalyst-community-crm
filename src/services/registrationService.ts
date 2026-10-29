import { insforge, isInsForgeConfigured } from '../lib/insforge';
import type { Role } from '../types/auth';
import type {
  Registration,
  RegisterInput,
  RegistrationStatus,
} from '../types/database';
import { getStoredEvents } from './eventService';
import { notificationService } from './notificationService';

const LOCAL_STORAGE_REGISTRATIONS_KEY = 'devcatalyst_hub_registrations';

// Seed demo registrations
export const INITIAL_DEMO_REGISTRATIONS: Registration[] = [
  {
    id: 'reg-001',
    event_id: 'evt-001',
    user_id: 'member-usr-003',
    participant_name: 'Marcus Vance',
    participant_email: 'marcus.member@devcatalyst.club',
    participant_phone: '+1 (555) 349-8201',
    institution: 'School of Computing, State University',
    status: 'CONFIRMED',
    ticket_token: 'tkt_a9b1c2d3e4f5061728394a5b6c7d8e9f',
    ticket_code: 'DC-TK-8A42F1',
    registered_at: '2026-02-14T10:00:00Z',
    updated_at: '2026-02-14T10:00:00Z',
  },
  {
    id: 'reg-002',
    event_id: 'evt-001',
    user_id: null,
    participant_name: 'Jordan Lee',
    participant_email: 'jordan.lee@external.edu',
    participant_phone: '+1 (555) 890-1234',
    institution: 'City Tech Institute',
    status: 'CONFIRMED',
    ticket_token: 'tkt_123456789abcdef0123456789abcdef0',
    ticket_code: 'DC-TK-1C90B2',
    registered_at: '2026-02-15T14:30:00Z',
    updated_at: '2026-02-15T14:30:00Z',
  },
  {
    id: 'reg-003',
    event_id: 'evt-002',
    user_id: 'member-usr-003',
    participant_name: 'Marcus Vance',
    participant_email: 'marcus.member@devcatalyst.club',
    participant_phone: '+1 (555) 349-8201',
    institution: 'School of Computing',
    status: 'CONFIRMED',
    ticket_token: 'tkt_fedcba9876543210fedcba9876543210',
    ticket_code: 'DC-TK-7B14A9',
    registered_at: '2026-02-16T11:00:00Z',
    updated_at: '2026-02-16T11:00:00Z',
  },
  {
    id: 'reg-004',
    event_id: 'evt-004',
    user_id: null,
    participant_name: 'Elena Rostova',
    participant_email: 'elena.r@innovate.org',
    participant_phone: null,
    institution: 'Open Innovation Labs',
    status: 'ATTENDED',
    ticket_token: 'tkt_0102030405060708090a0b0c0d0e0f10',
    ticket_code: 'DC-TK-3F50D8',
    registered_at: '2026-01-10T09:00:00Z',
    updated_at: '2026-01-20T10:15:00Z',
  },
];

export function getStoredRegistrations(): Registration[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_REGISTRATIONS_KEY);
    if (!raw) {
      localStorage.setItem(LOCAL_STORAGE_REGISTRATIONS_KEY, JSON.stringify(INITIAL_DEMO_REGISTRATIONS));
      return INITIAL_DEMO_REGISTRATIONS;
    }
    return JSON.parse(raw);
  } catch {
    return INITIAL_DEMO_REGISTRATIONS;
  }
}

export function saveStoredRegistrations(registrations: Registration[]) {
  try {
    localStorage.setItem(LOCAL_STORAGE_REGISTRATIONS_KEY, JSON.stringify(registrations));
  } catch (err) {
    console.error('Failed to save registrations to localStorage', err);
  }
}

function generateOpaqueToken(): string {
  const chars = '0123456789abcdef';
  let token = 'tkt_';
  for (let i = 0; i < 32; i++) {
    token += chars[Math.floor(Math.random() * chars.length)];
  }
  return token;
}

function generateHumanTicketCode(): string {
  const chars = '0123456789ABCDEF';
  let code = 'DC-TK-';
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

export const registrationService = {
  /**
   * Register a participant atomically for an event
   */
  async registerParticipant(input: RegisterInput): Promise<Registration> {
    if (!input.participant_name || input.participant_name.trim().length === 0) {
      throw new Error('Participant full name is required');
    }
    if (!input.participant_email || !input.participant_email.includes('@')) {
      throw new Error('A valid email address is required for registration');
    }

    const cleanEmail = input.participant_email.toLowerCase().trim();

    // InsForge remote RPC flow (locking event for atomic capacity)
    if (isInsForgeConfigured) {
      try {
        const { data, error } = await insforge.database.rpc('register_for_event', {
          p_event_id: input.event_id,
          p_user_id: input.user_id || null,
          p_participant_name: input.participant_name.trim(),
          p_participant_email: cleanEmail,
          p_participant_phone: input.participant_phone || null,
          p_institution: input.institution || null,
        });

        if (error) throw new Error(error.message);
        if (data && !data.success) {
          throw new Error(data.message || 'Registration failed');
        }
        return data.registration as Registration;
      } catch (err: unknown) {
        console.warn('InsForge remote register_for_event failed, falling back locally:', (err as Error).message);
      }
    }

    // Local / verification flow
    const events = getStoredEvents();
    const event = events.find((e) => e.id === input.event_id);
    if (!event) {
      throw new Error('Event does not exist');
    }

    if (event.status !== 'PUBLISHED') {
      throw new Error('This event is not currently accepting registrations');
    }

    const now = new Date().getTime();
    const deadline = new Date(event.registration_deadline).getTime();
    if (now > deadline) {
      throw new Error('The registration deadline for this event has passed');
    }

    const registrations = getStoredRegistrations();
    const activeForEvent = registrations.filter(
      (r) => r.event_id === input.event_id && r.status !== 'CANCELLED'
    );

    if (activeForEvent.length >= event.capacity) {
      throw new Error('This event has reached maximum capacity');
    }

    // Check duplicate active registration
    const existingActive = activeForEvent.find(
      (r) => r.participant_email.toLowerCase().trim() === cleanEmail
    );
    if (existingActive) {
      throw new Error('You already have an active registration for this event');
    }

    // Check if cancelled registration exists for reactivation
    const cancelledIndex = registrations.findIndex(
      (r) => r.event_id === input.event_id && r.participant_email.toLowerCase().trim() === cleanEmail && r.status === 'CANCELLED'
    );

    const token = generateOpaqueToken();
    const code = generateHumanTicketCode();

    if (cancelledIndex !== -1) {
      const reactivated: Registration = {
        ...registrations[cancelledIndex],
        participant_name: input.participant_name.trim(),
        participant_phone: input.participant_phone || registrations[cancelledIndex].participant_phone,
        institution: input.institution || registrations[cancelledIndex].institution,
        status: 'CONFIRMED',
        ticket_token: token,
        ticket_code: code,
        user_id: input.user_id || registrations[cancelledIndex].user_id,
        updated_at: new Date().toISOString(),
      };
      registrations[cancelledIndex] = reactivated;
      saveStoredRegistrations(registrations);
      const fullReactivated = { ...reactivated, event };
      notificationService
        .sendEventRegistrationNotification(fullReactivated, event)
        .catch((err) => console.warn('Failed to dispatch registration confirmation notification:', err));
      return fullReactivated;
    }

    const newReg: Registration = {
      id: `reg-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      event_id: input.event_id,
      user_id: input.user_id || null,
      participant_name: input.participant_name.trim(),
      participant_email: cleanEmail,
      participant_phone: input.participant_phone || null,
      institution: input.institution || null,
      status: 'CONFIRMED',
      ticket_token: token,
      ticket_code: code,
      registered_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      event,
    };

    registrations.push(newReg);
    saveStoredRegistrations(registrations);

    // Trigger notification asynchronously strictly after registration persists
    notificationService
      .sendEventRegistrationNotification(newReg, event)
      .catch((err) => console.warn('Failed to dispatch registration confirmation notification:', err));

    return newReg;
  },

  /**
   * Get registrations with optional filters and access control
   */
  async getRegistrations(
    filters?: {
      eventId?: string;
      status?: RegistrationStatus | 'ALL';
      search?: string;
    },
    currentUserId?: string,
    userRole?: Role
  ): Promise<Registration[]> {
    const isPrivileged = userRole === 'ADMIN' || userRole === 'ORGANIZER';

    if (!isPrivileged && !currentUserId) {
      throw new Error('Unauthorized: Must be authenticated or an event organizer to view registration lists');
    }

    if (isInsForgeConfigured) {
      try {
        let query = insforge.database
          .from('registrations')
          .select('*, event:events(id, title, start_time, venue, format, status), attendance(id, checked_in_at, method)')
          .order('registered_at', { ascending: false });

        if (!isPrivileged && currentUserId) {
          query = query.eq('user_id', currentUserId);
        }

        if (filters?.eventId && filters.eventId !== 'ALL') {
          query = query.eq('event_id', filters.eventId);
        }
        if (filters?.status && filters.status !== 'ALL') {
          query = query.eq('status', filters.status);
        }

        const { data, error } = await query;
        if (error) throw new Error(error.message);

        let results = (data || []).map((r: any) => ({
          ...r,
          attendance: r.attendance?.[0] || null,
        }));

        if (filters?.search && filters.search.trim()) {
          const s = filters.search.toLowerCase().trim();
          results = results.filter(
            (r: Registration) =>
              r.participant_name.toLowerCase().includes(s) ||
              r.participant_email.toLowerCase().includes(s) ||
              r.ticket_code.toLowerCase().includes(s)
          );
        }

        return results;
      } catch (err: unknown) {
        console.warn('InsForge remote getRegistrations failed, falling back locally:', (err as Error).message);
      }
    }

    const allRegs = getStoredRegistrations();
    const events = getStoredEvents();
    let regs = allRegs.map((r) => {
      const e = events.find((ev) => ev.id === r.event_id);
      return {
        ...r,
        event: e,
      };
    });

    if (!isPrivileged && currentUserId) {
      regs = regs.filter((r) => r.user_id === currentUserId);
    }

    if (filters?.eventId && filters.eventId !== 'ALL') {
      regs = regs.filter((r) => r.event_id === filters.eventId);
    }

    if (filters?.status && filters.status !== 'ALL') {
      regs = regs.filter((r) => r.status === filters.status);
    }

    if (filters?.search && filters.search.trim()) {
      const s = filters.search.toLowerCase().trim();
      regs = regs.filter(
        (r) =>
          r.participant_name.toLowerCase().includes(s) ||
          r.participant_email.toLowerCase().includes(s) ||
          r.ticket_code.toLowerCase().includes(s) ||
          (r.event && r.event.title.toLowerCase().includes(s))
      );
    }

    return regs.sort((a, b) => new Date(b.registered_at).getTime() - new Date(a.registered_at).getTime());
  },

  /**
   * Get single registration by token (Safe opaque public ticket view)
   */
  async getRegistrationByToken(ticketToken: string): Promise<Registration> {
    const cleanToken = ticketToken.trim();

    if (isInsForgeConfigured) {
      try {
        const { data, error } = await insforge.database
          .from('registrations')
          .select('*, event:events(id, title, description, start_time, end_time, venue, meeting_link, format, status), attendance(id, checked_in_at, method)')
          .eq('ticket_token', cleanToken)
          .single();

        if (error || !data) throw new Error('Ticket not found');
        return {
          ...data,
          attendance: data.attendance?.[0] || null,
        } as Registration;
      } catch (err: unknown) {
        console.warn('InsForge remote getRegistrationByToken failed:', (err as Error).message);
      }
    }

    const registrations = getStoredRegistrations();
    const reg = registrations.find((r) => r.ticket_token === cleanToken || r.ticket_code === cleanToken);
    if (!reg) {
      throw new Error('Ticket not found or invalid token');
    }

    const events = getStoredEvents();
    const event = events.find((e) => e.id === reg.event_id);

    return {
      ...reg,
      event,
    };
  },

  /**
   * Cancel registration
   */
  async cancelRegistration(
    registrationId: string,
    currentUserId?: string,
    userRole?: Role
  ): Promise<Registration> {
    const isPrivileged = userRole === 'ADMIN' || userRole === 'ORGANIZER';
    const registrations = getStoredRegistrations();
    const index = registrations.findIndex((r) => r.id === registrationId);
    if (index === -1) {
      throw new Error('Registration not found');
    }
    const current = registrations[index];

    if (!isPrivileged && current.user_id !== currentUserId) {
      throw new Error('Unauthorized: You can only cancel your own registration');
    }

    if (current.status === 'ATTENDED') {
      throw new Error('Cannot cancel a registration that has already attended');
    }

    if (isInsForgeConfigured) {
      try {
        const { data, error } = await insforge.database
          .from('registrations')
          .update({ status: 'CANCELLED', updated_at: new Date().toISOString() })
          .eq('id', registrationId)
          .select('*, event:events(*)')
          .single();

        if (error) throw new Error(error.message);
        return data as Registration;
      } catch (err: unknown) {
        console.warn('InsForge remote cancelRegistration failed:', (err as Error).message);
      }
    }

    const updated: Registration = {
      ...current,
      status: 'CANCELLED',
      updated_at: new Date().toISOString(),
    };
    registrations[index] = updated;
    saveStoredRegistrations(registrations);

    // Trigger cancellation notification
    const events = getStoredEvents();
    const event = events.find((e) => e.id === updated.event_id) || updated.event;
    if (event) {
      notificationService
        .sendEventCancellationNotification(updated, event)
        .catch((err) => console.warn('Failed to dispatch registration cancellation notification:', err));
    }

    return updated;
  },

  /**
   * Reactivate a cancelled registration if capacity allows
   */
  async reactivateRegistration(
    registrationId: string,
    userRole?: Role
  ): Promise<Registration> {
    const isPrivileged = userRole === 'ADMIN' || userRole === 'ORGANIZER';
    if (!isPrivileged) {
      throw new Error('Unauthorized: Only organizers can reactivate cancelled registrations');
    }

    const registrations = getStoredRegistrations();
    const index = registrations.findIndex((r) => r.id === registrationId);
    if (index === -1) {
      throw new Error('Registration not found');
    }
    const current = registrations[index];

    const events = getStoredEvents();
    const event = events.find((e) => e.id === current.event_id);
    if (!event) throw new Error('Event not found');

    const activeCount = registrations.filter(
      (r) => r.event_id === current.event_id && r.status !== 'CANCELLED'
    ).length;

    if (activeCount >= event.capacity) {
      throw new Error('Cannot reactivate: Event has reached capacity');
    }

    const updated: Registration = {
      ...current,
      status: 'CONFIRMED',
      ticket_token: generateOpaqueToken(),
      ticket_code: generateHumanTicketCode(),
      updated_at: new Date().toISOString(),
    };
    registrations[index] = updated;
    saveStoredRegistrations(registrations);
    return updated;
  },
};
