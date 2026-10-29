import { insforge, isInsForgeConfigured } from '../lib/insforge';
import type { Role } from '../types/auth';
import type {
  EventItem,
  CreateEventInput,
  UpdateEventInput,
  EventStatus,
  EventType,
  EventFormat,
  EventSummaryMetrics,
} from '../types/database';

const LOCAL_STORAGE_EVENTS_KEY = 'devcatalyst_hub_events';
const LOCAL_STORAGE_REGISTRATIONS_KEY = 'devcatalyst_hub_registrations';
const LOCAL_STORAGE_ATTENDANCE_KEY = 'devcatalyst_hub_attendance';

export const INITIAL_DEMO_EVENTS: EventItem[] = [
  {
    id: 'evt-001',
    title: 'DevCatalyst Annual Hackathon 2026',
    description: '48-hour collaborative build sprint focusing on AI agent workflows and modern community tooling.',
    banner_url: 'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?w=1200&auto=format&fit=crop&q=80',
    event_type: 'HACKATHON',
    format: 'HYBRID',
    venue: 'Auditorium Hall B, Tech Campus & Discord Live Stage',
    meeting_link: 'https://meet.devcatalyst.club/hackathon-2026',
    start_time: '2026-11-15T09:00:00Z',
    end_time: '2026-11-17T17:00:00Z',
    registration_deadline: '2026-11-10T23:59:59Z',
    capacity: 150,
    is_public: true,
    status: 'PUBLISHED',
    project_id: 'prj-002',
    project: {
      id: 'prj-002',
      code: 'PRJ-02',
      title: 'Hackathon 2026 Event Platform',
    },
    created_by: 'admin-usr-001',
    created_at: '2026-02-10T14:30:00Z',
    updated_at: '2026-02-15T12:00:00Z',
  },
  {
    id: 'evt-002',
    title: 'Modern Design Systems & CSS Architecture',
    description: 'Hands-on workshop breaking down atomic token architecture, dark mode, and high-density UI patterns.',
    banner_url: 'https://images.unsplash.com/photo-1581291518857-4e27b48ff24e?w=1200&auto=format&fit=crop&q=80',
    event_type: 'WORKSHOP',
    format: 'IN_PERSON',
    venue: 'DevCatalyst Innovation Lab, Room 302',
    meeting_link: null,
    start_time: '2026-11-25T14:00:00Z',
    end_time: '2026-11-25T17:30:00Z',
    registration_deadline: '2026-11-24T18:00:00Z',
    capacity: 45,
    is_public: true,
    status: 'PUBLISHED',
    project_id: 'prj-001',
    project: {
      id: 'prj-001',
      code: 'PRJ-01',
      title: 'DevCatalyst Hub Platform',
    },
    created_by: 'lead-usr-002',
    created_at: '2026-02-12T10:00:00Z',
    updated_at: '2026-02-16T09:00:00Z',
  },
  {
    id: 'evt-003',
    title: 'Cloud Database Architecture with InsForge',
    description: 'Deep-dive into Row Level Security policies, PostgreSQL RPC stored procedures, and atomic transactions.',
    banner_url: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=1200&auto=format&fit=crop&q=80',
    event_type: 'TECH_TALK',
    format: 'ONLINE',
    venue: null,
    meeting_link: 'https://meet.devcatalyst.club/insforge-tech-talk',
    start_time: '2026-12-05T18:00:00Z',
    end_time: '2026-12-05T19:30:00Z',
    registration_deadline: '2026-12-05T16:00:00Z',
    capacity: 200,
    is_public: true,
    status: 'DRAFT',
    project_id: null,
    project: null,
    created_by: 'admin-usr-001',
    created_at: '2026-02-18T11:00:00Z',
    updated_at: '2026-02-18T11:00:00Z',
  },
  {
    id: 'evt-004',
    title: 'Open Source Mentorship Kickoff',
    description: 'Orientation session connecting student contributors with industry mentors.',
    banner_url: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=1200&auto=format&fit=crop&q=80',
    event_type: 'MEETUP',
    format: 'IN_PERSON',
    venue: 'Student Activity Center, Hall 1',
    meeting_link: null,
    start_time: '2026-09-20T10:00:00Z',
    end_time: '2026-09-20T13:00:00Z',
    registration_deadline: '2026-09-18T23:59:59Z',
    capacity: 60,
    is_public: true,
    status: 'COMPLETED',
    project_id: 'prj-003',
    project: {
      id: 'prj-003',
      code: 'PRJ-03',
      title: 'Open Source Mentorship Program',
    },
    created_by: 'lead-usr-002',
    created_at: '2026-01-08T09:00:00Z',
    updated_at: '2026-01-21T14:00:00Z',
  },
];

export function getStoredEvents(): EventItem[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_EVENTS_KEY);
    if (!raw) {
      localStorage.setItem(LOCAL_STORAGE_EVENTS_KEY, JSON.stringify(INITIAL_DEMO_EVENTS));
      return INITIAL_DEMO_EVENTS;
    }
    return JSON.parse(raw);
  } catch {
    return INITIAL_DEMO_EVENTS;
  }
}

export function saveStoredEvents(events: EventItem[]) {
  try {
    localStorage.setItem(LOCAL_STORAGE_EVENTS_KEY, JSON.stringify(events));
  } catch (err) {
    console.error('Failed to save events to localStorage', err);
  }
}

function validateEventInputs(input: CreateEventInput | UpdateEventInput, isUpdate = false) {
  if (!isUpdate || input.title !== undefined) {
    if (!input.title || input.title.trim().length === 0) {
      throw new Error('Event title is required');
    }
  }

  if (input.start_time && input.end_time) {
    const start = new Date(input.start_time).getTime();
    const end = new Date(input.end_time).getTime();
    if (end <= start) {
      throw new Error('Event end time must be after the start time');
    }
  }

  if (input.registration_deadline && input.start_time) {
    const deadline = new Date(input.registration_deadline).getTime();
    const start = new Date(input.start_time).getTime();
    if (deadline > start) {
      throw new Error('Registration deadline must precede or equal the event start time');
    }
  }

  if (input.capacity !== undefined && input.capacity <= 0) {
    throw new Error('Event capacity must be greater than zero');
  }

  // Format validations
  const format = input.format;
  if (format === 'IN_PERSON' && !input.venue && !isUpdate) {
    throw new Error('Venue location is required for in-person events');
  }
  if (format === 'ONLINE' && !input.meeting_link && !isUpdate) {
    throw new Error('Meeting link is required for online events');
  }
}

// Valid lifecycle transitions
const VALID_TRANSITIONS: Record<EventStatus, EventStatus[]> = {
  DRAFT: ['PUBLISHED', 'CANCELLED'],
  PUBLISHED: ['COMPLETED', 'CANCELLED'],
  CANCELLED: ['DRAFT'],
  COMPLETED: ['ARCHIVED'],
  ARCHIVED: [],
};

export const eventService = {
  /**
   * Get events with counts and composable filtering
   */
  async getEvents(
    filters?: {
      search?: string;
      status?: EventStatus | 'ALL';
      eventType?: EventType | 'ALL';
      format?: EventFormat | 'ALL';
      publicOnly?: boolean;
    },
    currentUserId?: string,
    userRole?: Role
  ): Promise<EventItem[]> {
    const isPrivileged = userRole === 'ADMIN' || userRole === 'ORGANIZER';

    if (isInsForgeConfigured) {
      try {
        let query = insforge.database
          .from('events')
          .select('*, project:projects(id, code, title), registrations(id, status), attendance(id)')
          .order('start_time', { ascending: true });

        if (!isPrivileged) {
          query = query.eq('status', 'PUBLISHED').eq('is_public', true);
        }

        if (filters?.status && filters.status !== 'ALL') {
          query = query.eq('status', filters.status);
        }
        if (filters?.eventType && filters.eventType !== 'ALL') {
          query = query.eq('event_type', filters.eventType);
        }
        if (filters?.format && filters.format !== 'ALL') {
          query = query.eq('format', filters.format);
        }

        const { data, error } = await query;
        if (error) throw new Error(error.message);

        let results = (data || []).map((e: any) => {
          const activeRegs = (e.registrations || []).filter((r: any) => r.status !== 'CANCELLED').length;
          const attended = (e.attendance || []).length;
          return {
            ...e,
            registered_count: activeRegs,
            attended_count: attended,
          };
        });

        if (filters?.search && filters.search.trim()) {
          const s = filters.search.toLowerCase().trim();
          results = results.filter(
            (e: EventItem) =>
              e.title.toLowerCase().includes(s) ||
              (e.description && e.description.toLowerCase().includes(s)) ||
              (e.venue && e.venue.toLowerCase().includes(s))
          );
        }

        return results;
      } catch (err: unknown) {
        console.warn('InsForge remote event fetch failed, falling back locally:', (err as Error).message);
      }
    }

    // Local / verification flow
    const allEvents = getStoredEvents();
    let events = [...allEvents];

    // Read registrations and attendance for counters
    const rawRegs = localStorage.getItem(LOCAL_STORAGE_REGISTRATIONS_KEY);
    const regs: any[] = rawRegs
      ? JSON.parse(rawRegs)
      : [
          { id: 'reg-001', event_id: 'evt-001', status: 'CONFIRMED' },
          { id: 'reg-002', event_id: 'evt-001', status: 'CONFIRMED' },
          { id: 'reg-003', event_id: 'evt-002', status: 'CONFIRMED' },
          { id: 'reg-004', event_id: 'evt-004', status: 'ATTENDED' },
        ];
    const rawAtt = localStorage.getItem(LOCAL_STORAGE_ATTENDANCE_KEY);
    const att: any[] = rawAtt
      ? JSON.parse(rawAtt)
      : [{ id: 'att-001', event_id: 'evt-004', registration_id: 'reg-004' }];

    events = events.map((e) => {
      const activeRegs = regs.filter((r) => r.event_id === e.id && r.status !== 'CANCELLED').length;
      const attended = att.filter((a) => a.event_id === e.id).length;
      return {
        ...e,
        registered_count: activeRegs,
        attended_count: attended,
      };
    });

    // Access control: Non-privileged users only see PUBLISHED public events or their own created events
    if (!isPrivileged) {
      events = events.filter((e) => (e.status === 'PUBLISHED' && e.is_public) || (currentUserId && e.created_by === currentUserId));
    }

    // Filter: search
    if (filters?.search && filters.search.trim()) {
      const s = filters.search.toLowerCase().trim();
      events = events.filter(
        (e) =>
          e.title.toLowerCase().includes(s) ||
          (e.description && e.description.toLowerCase().includes(s)) ||
          (e.venue && e.venue.toLowerCase().includes(s))
      );
    }

    // Filter: status
    if (filters?.status && filters.status !== 'ALL') {
      events = events.filter((e) => e.status === filters.status);
    }

    // Filter: eventType
    if (filters?.eventType && filters.eventType !== 'ALL') {
      events = events.filter((e) => e.event_type === filters.eventType);
    }

    // Filter: format
    if (filters?.format && filters.format !== 'ALL') {
      events = events.filter((e) => e.format === filters.format);
    }

    return events.sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());
  },

  /**
   * Get single event by ID with permissions verification
   */
  async getEventById(
    eventId: string,
    currentUserId?: string,
    userRole?: Role
  ): Promise<EventItem> {
    const isPrivileged = userRole === 'ADMIN' || userRole === 'ORGANIZER';

    if (isInsForgeConfigured) {
      try {
        const { data, error } = await insforge.database
          .from('events')
          .select('*, project:projects(id, code, title), registrations(id, status), attendance(id)')
          .eq('id', eventId)
          .single();

        if (error || !data) throw new Error('Event not found or unauthorized');

        if (!isPrivileged && data.status !== 'PUBLISHED' && data.created_by !== currentUserId) {
          throw new Error('You do not have permission to view this event');
        }

        const activeRegs = (data.registrations || []).filter((r: any) => r.status !== 'CANCELLED').length;
        const attended = (data.attendance || []).length;

        return {
          ...data,
          registered_count: activeRegs,
          attended_count: attended,
        };
      } catch (err: unknown) {
        console.warn('InsForge remote getEventById failed, falling back locally:', (err as Error).message);
      }
    }

    const events = getStoredEvents();
    const event = events.find((e) => e.id === eventId);
    if (!event) {
      throw new Error('Event not found');
    }

    if (!isPrivileged && event.status !== 'PUBLISHED' && event.created_by !== currentUserId) {
      throw new Error('You do not have permission to view this event');
    }

    const rawRegs = localStorage.getItem(LOCAL_STORAGE_REGISTRATIONS_KEY);
    const regs: any[] = rawRegs ? JSON.parse(rawRegs) : [];
    const rawAtt = localStorage.getItem(LOCAL_STORAGE_ATTENDANCE_KEY);
    const att: any[] = rawAtt ? JSON.parse(rawAtt) : [];

    const activeRegs = regs.filter((r) => r.event_id === event.id && r.status !== 'CANCELLED').length;
    const attended = att.filter((a) => a.event_id === event.id).length;

    return {
      ...event,
      registered_count: activeRegs,
      attended_count: attended,
    };
  },

  /**
   * Create an event with strict validation and permission checks
   */
  async createEvent(
    input: CreateEventInput,
    currentUserId?: string,
    userRole?: Role
  ): Promise<EventItem> {
    const isPrivileged = userRole === 'ADMIN' || userRole === 'ORGANIZER';
    if (!isPrivileged || !currentUserId) {
      throw new Error('Unauthorized: Only administrators and organizers can create club events');
    }

    validateEventInputs(input, false);

    if (isInsForgeConfigured) {
      try {
        const payload = {
          title: input.title.trim(),
          description: input.description?.trim() || null,
          banner_url: input.banner_url || null,
          event_type: input.event_type || 'WORKSHOP',
          format: input.format || 'IN_PERSON',
          venue: input.venue?.trim() || null,
          meeting_link: input.meeting_link?.trim() || null,
          start_time: input.start_time,
          end_time: input.end_time,
          registration_deadline: input.registration_deadline,
          capacity: input.capacity,
          is_public: input.is_public ?? true,
          status: input.status || 'DRAFT',
          project_id: input.project_id || null,
          created_by: currentUserId,
        };

        const { data, error } = await insforge.database
          .from('events')
          .insert([payload])
          .select('*, project:projects(id, code, title)')
          .single();

        if (error) throw new Error(error.message);
        return { ...data, registered_count: 0, attended_count: 0 };
      } catch (err: unknown) {
        console.warn('InsForge remote createEvent failed, saving locally:', (err as Error).message);
      }
    }

    const allEvents = getStoredEvents();
    const newEvent: EventItem = {
      id: `evt-${Date.now()}`,
      title: input.title.trim(),
      description: input.description?.trim() || null,
      banner_url: input.banner_url || null,
      event_type: input.event_type || 'WORKSHOP',
      format: input.format || 'IN_PERSON',
      venue: input.venue?.trim() || null,
      meeting_link: input.meeting_link?.trim() || null,
      start_time: input.start_time,
      end_time: input.end_time,
      registration_deadline: input.registration_deadline,
      capacity: input.capacity,
      is_public: input.is_public ?? true,
      status: input.status || 'DRAFT',
      project_id: input.project_id || null,
      created_by: currentUserId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      registered_count: 0,
      attended_count: 0,
    };

    allEvents.push(newEvent);
    saveStoredEvents(allEvents);
    return newEvent;
  },

  /**
   * Update event with lifecycle transition verification
   */
  async updateEvent(
    eventId: string,
    input: UpdateEventInput,
    currentUserId?: string,
    userRole?: Role
  ): Promise<EventItem> {
    const isPrivileged = userRole === 'ADMIN' || userRole === 'ORGANIZER';
    const allEvents = getStoredEvents();
    const index = allEvents.findIndex((e) => e.id === eventId);
    if (index === -1) {
      throw new Error('Event not found');
    }
    const current = allEvents[index];

    if (!isPrivileged && current.created_by !== currentUserId) {
      throw new Error('Unauthorized: You do not have permission to edit this event');
    }

    validateEventInputs(input, true);

    // Validate lifecycle transitions if status is changing
    if (input.status && input.status !== current.status) {
      const allowedNext = VALID_TRANSITIONS[current.status] || [];
      if (!allowedNext.includes(input.status)) {
        throw new Error(
          `Invalid state transition: Cannot transition event from ${current.status} to ${input.status}. Allowed transitions: ${allowedNext.join(', ') || 'None'}`
        );
      }
    }

    if (isInsForgeConfigured) {
      try {
        const payload: Record<string, any> = {
          updated_at: new Date().toISOString(),
        };
        if (input.title !== undefined) payload.title = input.title.trim();
        if (input.description !== undefined) payload.description = input.description?.trim() || null;
        if (input.banner_url !== undefined) payload.banner_url = input.banner_url;
        if (input.event_type !== undefined) payload.event_type = input.event_type;
        if (input.format !== undefined) payload.format = input.format;
        if (input.venue !== undefined) payload.venue = input.venue?.trim() || null;
        if (input.meeting_link !== undefined) payload.meeting_link = input.meeting_link?.trim() || null;
        if (input.start_time !== undefined) payload.start_time = input.start_time;
        if (input.end_time !== undefined) payload.end_time = input.end_time;
        if (input.registration_deadline !== undefined) payload.registration_deadline = input.registration_deadline;
        if (input.capacity !== undefined) payload.capacity = input.capacity;
        if (input.is_public !== undefined) payload.is_public = input.is_public;
        if (input.status !== undefined) payload.status = input.status;
        if (input.project_id !== undefined) payload.project_id = input.project_id;

        const { data, error } = await insforge.database
          .from('events')
          .update(payload)
          .eq('id', eventId)
          .select('*, project:projects(id, code, title)')
          .single();

        if (error) throw new Error(error.message);
        return data as EventItem;
      } catch (err: unknown) {
        console.warn('InsForge remote updateEvent failed, updating locally:', (err as Error).message);
      }
    }

    const updated: EventItem = {
      ...current,
      title: input.title !== undefined ? input.title.trim() : current.title,
      description: input.description !== undefined ? input.description?.trim() || null : current.description,
      banner_url: input.banner_url !== undefined ? input.banner_url : current.banner_url,
      event_type: input.event_type !== undefined ? input.event_type : current.event_type,
      format: input.format !== undefined ? input.format : current.format,
      venue: input.venue !== undefined ? input.venue?.trim() || null : current.venue,
      meeting_link: input.meeting_link !== undefined ? input.meeting_link?.trim() || null : current.meeting_link,
      start_time: input.start_time !== undefined ? input.start_time : current.start_time,
      end_time: input.end_time !== undefined ? input.end_time : current.end_time,
      registration_deadline: input.registration_deadline !== undefined ? input.registration_deadline : current.registration_deadline,
      capacity: input.capacity !== undefined ? input.capacity : current.capacity,
      is_public: input.is_public !== undefined ? input.is_public : current.is_public,
      status: input.status !== undefined ? input.status : current.status,
      project_id: input.project_id !== undefined ? input.project_id : current.project_id,
      updated_at: new Date().toISOString(),
    };

    allEvents[index] = updated;
    saveStoredEvents(allEvents);
    return updated;
  },

  /**
   * Delete event and cascade locally
   */
  async deleteEvent(eventId: string, currentUserId?: string, userRole?: Role): Promise<void> {
    const isPrivileged = userRole === 'ADMIN' || userRole === 'ORGANIZER';
    const allEvents = getStoredEvents();
    const event = allEvents.find((e) => e.id === eventId);
    if (!event) {
      throw new Error('Event not found');
    }

    if (!isPrivileged && event.created_by !== currentUserId) {
      throw new Error('Unauthorized: You do not have permission to delete this event');
    }

    if (isInsForgeConfigured) {
      try {
        const { error } = await insforge.database.from('events').delete().eq('id', eventId);
        if (error) throw new Error(error.message);
        return;
      } catch (err: unknown) {
        console.warn('InsForge remote deleteEvent failed, removing locally:', (err as Error).message);
      }
    }

    const filtered = allEvents.filter((e) => e.id !== eventId);
    saveStoredEvents(filtered);

    // Clean up associated registrations and attendance locally
    try {
      const rawRegs = localStorage.getItem(LOCAL_STORAGE_REGISTRATIONS_KEY);
      if (rawRegs) {
        const regs: any[] = JSON.parse(rawRegs);
        localStorage.setItem(
          LOCAL_STORAGE_REGISTRATIONS_KEY,
          JSON.stringify(regs.filter((r) => r.event_id !== eventId))
        );
      }
      const rawAtt = localStorage.getItem(LOCAL_STORAGE_ATTENDANCE_KEY);
      if (rawAtt) {
        const att: any[] = JSON.parse(rawAtt);
        localStorage.setItem(
          LOCAL_STORAGE_ATTENDANCE_KEY,
          JSON.stringify(att.filter((a) => a.event_id !== eventId))
        );
      }
    } catch {
      // ignore
    }
  },

  /**
   * Get high-level events metrics summary
   */
  async getEventMetrics(): Promise<EventSummaryMetrics> {
    const events = getStoredEvents();
    const rawRegs = localStorage.getItem(LOCAL_STORAGE_REGISTRATIONS_KEY);
    const regs: any[] = rawRegs ? JSON.parse(rawRegs) : [];
    const rawAtt = localStorage.getItem(LOCAL_STORAGE_ATTENDANCE_KEY);
    const att: any[] = rawAtt ? JSON.parse(rawAtt) : [];

    return {
      total_events: events.length,
      published_events: events.filter((e) => e.status === 'PUBLISHED').length,
      total_registrations: regs.filter((r) => r.status !== 'CANCELLED').length,
      total_attended: att.length,
    };
  },
};
