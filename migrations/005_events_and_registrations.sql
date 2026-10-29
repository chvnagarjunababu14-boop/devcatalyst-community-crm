-- =============================================================================
-- Migration: 005_events_and_registrations.sql
-- Description: Schema, atomic capacity registration procedures, ticket tokens,
--              attendance tracking, and RLS policies for DevCatalyst Hub Events.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. EVENTS TABLE
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    banner_url TEXT,
    event_type TEXT NOT NULL DEFAULT 'WORKSHOP'
        CHECK (event_type IN ('WORKSHOP', 'HACKATHON', 'TECH_TALK', 'INFO_SESSION', 'MEETUP', 'BOOTCAMP', 'OTHER')),
    format TEXT NOT NULL DEFAULT 'IN_PERSON'
        CHECK (format IN ('IN_PERSON', 'ONLINE', 'HYBRID')),
    venue TEXT,
    meeting_link TEXT,
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,
    registration_deadline TIMESTAMPTZ NOT NULL,
    capacity INTEGER NOT NULL CHECK (capacity > 0),
    is_public BOOLEAN NOT NULL DEFAULT true,
    status TEXT NOT NULL DEFAULT 'DRAFT'
        CHECK (status IN ('DRAFT', 'PUBLISHED', 'COMPLETED', 'CANCELLED', 'ARCHIVED')),
    project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT chk_event_times CHECK (end_time > start_time),
    CONSTRAINT chk_registration_deadline CHECK (registration_deadline <= start_time)
);

CREATE INDEX IF NOT EXISTS idx_events_status ON public.events(status);
CREATE INDEX IF NOT EXISTS idx_events_start_time ON public.events(start_time);
CREATE INDEX IF NOT EXISTS idx_events_is_public ON public.events(is_public);
CREATE INDEX IF NOT EXISTS idx_events_project_id ON public.events(project_id);

-- -----------------------------------------------------------------------------
-- 2. REGISTRATIONS TABLE
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.registrations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    participant_name TEXT NOT NULL,
    participant_email TEXT NOT NULL,
    participant_phone TEXT,
    institution TEXT,
    status TEXT NOT NULL DEFAULT 'CONFIRMED'
        CHECK (status IN ('CONFIRMED', 'CANCELLED', 'ATTENDED', 'WAITLISTED')),
    ticket_token TEXT NOT NULL UNIQUE, -- Opaque cryptographic token for QR verification
    ticket_code TEXT NOT NULL UNIQUE,  -- Human readable ticket code (e.g. EVT-TK-1082)
    registered_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Invariant: One active (non-cancelled) registration per participant email per event
CREATE UNIQUE INDEX IF NOT EXISTS uq_event_active_registration_email
    ON public.registrations(event_id, lower(trim(participant_email)))
    WHERE status != 'CANCELLED';

CREATE INDEX IF NOT EXISTS idx_registrations_event_id ON public.registrations(event_id);
CREATE INDEX IF NOT EXISTS idx_registrations_user_id ON public.registrations(user_id);
CREATE INDEX IF NOT EXISTS idx_registrations_ticket_token ON public.registrations(ticket_token);
CREATE INDEX IF NOT EXISTS idx_registrations_status ON public.registrations(status);

-- -----------------------------------------------------------------------------
-- 3. ATTENDANCE TABLE
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.attendance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
    registration_id UUID NOT NULL REFERENCES public.registrations(id) ON DELETE CASCADE UNIQUE,
    checked_in_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    checked_in_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    method TEXT NOT NULL DEFAULT 'QR_SCAN'
        CHECK (method IN ('QR_SCAN', 'MANUAL')),
    notes TEXT
);

CREATE INDEX IF NOT EXISTS idx_attendance_event_id ON public.attendance(event_id);
CREATE INDEX IF NOT EXISTS idx_attendance_registration_id ON public.attendance(registration_id);

-- -----------------------------------------------------------------------------
-- 4. ATOMIC CAPACITY REGISTRATION PROCEDURE
-- Concurrency safe registration with row locking and reactivation of cancelled rows
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.register_for_event(
    p_event_id UUID,
    p_user_id UUID,
    p_participant_name TEXT,
    p_participant_email TEXT,
    p_participant_phone TEXT DEFAULT NULL,
    p_institution TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_event RECORD;
    v_active_count INTEGER;
    v_existing_cancelled RECORD;
    v_new_token TEXT;
    v_new_code TEXT;
    v_registration RECORD;
    v_clean_email TEXT;
BEGIN
    v_clean_email := lower(trim(p_participant_email));

    -- 1. Lock the event row to prevent race conditions exceeding capacity
    SELECT * INTO v_event
    FROM public.events
    WHERE id = p_event_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'EVENT_NOT_FOUND', 'message', 'Event does not exist');
    END IF;

    -- 2. Validate event status
    IF v_event.status != 'PUBLISHED' THEN
        RETURN jsonb_build_object('success', false, 'error', 'EVENT_NOT_PUBLISHED', 'message', 'This event is not currently accepting registrations');
    END IF;

    -- 3. Validate registration deadline
    IF timezone('utc'::text, now()) > v_event.registration_deadline THEN
        RETURN jsonb_build_object('success', false, 'error', 'DEADLINE_PASSED', 'message', 'The registration deadline for this event has passed');
    END IF;

    -- 4. Check active capacity
    SELECT COUNT(*) INTO v_active_count
    FROM public.registrations
    WHERE event_id = p_event_id AND status != 'CANCELLED';

    IF v_active_count >= v_event.capacity THEN
        RETURN jsonb_build_object('success', false, 'error', 'EVENT_FULL', 'message', 'This event has reached maximum capacity');
    END IF;

    -- 5. Check if user already has an active registration
    IF EXISTS (
        SELECT 1 FROM public.registrations
        WHERE event_id = p_event_id
          AND lower(trim(participant_email)) = v_clean_email
          AND status != 'CANCELLED'
    ) THEN
        RETURN jsonb_build_object('success', false, 'error', 'DUPLICATE_REGISTRATION', 'message', 'You already have an active registration for this event');
    END IF;

    -- Generate opaque crypto token and human-readable code
    v_new_token := 'tkt_' || encode(gen_random_bytes(16), 'hex');
    v_new_code := 'DC-TK-' || upper(substring(encode(gen_random_bytes(4), 'hex') from 1 for 6));

    -- 6. Check for a previously cancelled registration for reactivation
    SELECT * INTO v_existing_cancelled
    FROM public.registrations
    WHERE event_id = p_event_id
      AND lower(trim(participant_email)) = v_clean_email
      AND status = 'CANCELLED'
    LIMIT 1;

    IF FOUND THEN
        UPDATE public.registrations
        SET status = 'CONFIRMED',
            participant_name = trim(p_participant_name),
            participant_phone = p_participant_phone,
            institution = p_institution,
            ticket_token = v_new_token,
            ticket_code = v_new_code,
            user_id = COALESCE(p_user_id, v_existing_cancelled.user_id),
            updated_at = timezone('utc'::text, now())
        WHERE id = v_existing_cancelled.id
        RETURNING * INTO v_registration;
    ELSE
        INSERT INTO public.registrations (
            event_id,
            user_id,
            participant_name,
            participant_email,
            participant_phone,
            institution,
            status,
            ticket_token,
            ticket_code
        ) VALUES (
            p_event_id,
            p_user_id,
            trim(p_participant_name),
            v_clean_email,
            p_participant_phone,
            p_institution,
            'CONFIRMED',
            v_new_token,
            v_new_code
        )
        RETURNING * INTO v_registration;
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'registration', to_jsonb(v_registration)
    );
END;
$$;

-- -----------------------------------------------------------------------------
-- 5. ATOMIC ATTENDANCE CHECK-IN VERIFICATION PROCEDURE
-- Server-side validation of opaque ticket tokens and QR codes
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.verify_and_checkin_ticket(
    p_event_id UUID,
    p_ticket_identifier TEXT, -- Accepts opaque ticket_token or ticket_code
    p_checked_in_by UUID DEFAULT NULL,
    p_method TEXT DEFAULT 'QR_SCAN',
    p_notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_reg RECORD;
    v_att RECORD;
    v_clean_ident TEXT;
BEGIN
    v_clean_ident := trim(p_ticket_identifier);

    -- 1. Find registration by ticket token or ticket code
    SELECT r.*, e.title as event_title, e.status as event_status
    INTO v_reg
    FROM public.registrations r
    JOIN public.events e ON e.id = r.event_id
    WHERE (r.ticket_token = v_clean_ident OR r.ticket_code = v_clean_ident)
    FOR UPDATE OF r;

    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'success', false,
            'code', 'INVALID_TICKET',
            'message', 'Ticket token or code was not found'
        );
    END IF;

    -- 2. Verify ticket belongs to the target event
    IF v_reg.event_id != p_event_id THEN
        RETURN jsonb_build_object(
            'success', false,
            'code', 'WRONG_EVENT',
            'message', format('This ticket belongs to another event: "%s"', v_reg.event_title),
            'registration', to_jsonb(v_reg)
        );
    END IF;

    -- 3. Verify registration is not cancelled
    IF v_reg.status = 'CANCELLED' THEN
        RETURN jsonb_build_object(
            'success', false,
            'code', 'REGISTRATION_CANCELLED',
            'message', 'This ticket has been cancelled by the participant or organizer',
            'registration', to_jsonb(v_reg)
        );
    END IF;

    -- 4. Check if already checked in (duplicate prevention)
    SELECT * INTO v_att
    FROM public.attendance
    WHERE registration_id = v_reg.id;

    IF FOUND THEN
        RETURN jsonb_build_object(
            'success', false,
            'code', 'ALREADY_CHECKED_IN',
            'message', format('Participant was already checked in at %s', to_char(v_att.checked_in_at, 'HH12:MI AM on Mon DD, YYYY')),
            'registration', to_jsonb(v_reg),
            'attendance', to_jsonb(v_att)
        );
    END IF;

    -- 5. Record attendance check-in
    INSERT INTO public.attendance (
        event_id,
        registration_id,
        checked_in_by,
        method,
        notes
    ) VALUES (
        p_event_id,
        v_reg.id,
        p_checked_in_by,
        p_method,
        p_notes
    )
    RETURNING * INTO v_att;

    -- 6. Update registration status to ATTENDED
    UPDATE public.registrations
    SET status = 'ATTENDED',
        updated_at = timezone('utc'::text, now())
    WHERE id = v_reg.id;

    RETURN jsonb_build_object(
        'success', true,
        'code', 'CHECKED_IN',
        'message', format('Successfully checked in %s', v_reg.participant_name),
        'registration', to_jsonb(v_reg),
        'attendance', to_jsonb(v_att)
    );
END;
$$;

-- -----------------------------------------------------------------------------
-- 6. ROW LEVEL SECURITY POLICIES
-- -----------------------------------------------------------------------------
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;

-- EVENTS RLS
DROP POLICY IF EXISTS "Public can view published public events" ON public.events;
CREATE POLICY "Public can view published public events"
    ON public.events FOR SELECT
    USING (status = 'PUBLISHED' AND is_public = true);

DROP POLICY IF EXISTS "Organizers and Admins can view all events" ON public.events;
CREATE POLICY "Organizers and Admins can view all events"
    ON public.events FOR SELECT
    TO authenticated
    USING (
        public.has_role('ORGANIZER') OR 
        public.has_role('ADMIN') OR
        created_by = auth.uid()
    );

DROP POLICY IF EXISTS "Organizers and Admins can insert events" ON public.events;
CREATE POLICY "Organizers and Admins can insert events"
    ON public.events FOR INSERT
    TO authenticated
    WITH CHECK (public.has_role('ORGANIZER') OR public.has_role('ADMIN'));

DROP POLICY IF EXISTS "Organizers and Admins can update events" ON public.events;
CREATE POLICY "Organizers and Admins can update events"
    ON public.events FOR UPDATE
    TO authenticated
    USING (public.has_role('ORGANIZER') OR public.has_role('ADMIN') OR created_by = auth.uid())
    WITH CHECK (public.has_role('ORGANIZER') OR public.has_role('ADMIN') OR created_by = auth.uid());

DROP POLICY IF EXISTS "Organizers and Admins can delete events" ON public.events;
CREATE POLICY "Organizers and Admins can delete events"
    ON public.events FOR DELETE
    TO authenticated
    USING (public.has_role('ORGANIZER') OR public.has_role('ADMIN') OR created_by = auth.uid());

-- REGISTRATIONS RLS
-- Protect participant personal info from being scraped publicly
DROP POLICY IF EXISTS "Organizers and Admins can view registrations" ON public.registrations;
CREATE POLICY "Organizers and Admins can view registrations"
    ON public.registrations FOR SELECT
    TO authenticated
    USING (public.has_role('ORGANIZER') OR public.has_role('ADMIN'));

DROP POLICY IF EXISTS "Users can view their own registrations" ON public.registrations;
CREATE POLICY "Users can view their own registrations"
    ON public.registrations FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Organizers can update registration status" ON public.registrations;
CREATE POLICY "Organizers can update registration status"
    ON public.registrations FOR UPDATE
    TO authenticated
    USING (public.has_role('ORGANIZER') OR public.has_role('ADMIN'))
    WITH CHECK (public.has_role('ORGANIZER') OR public.has_role('ADMIN'));

DROP POLICY IF EXISTS "Users can cancel their own registrations" ON public.registrations;
CREATE POLICY "Users can cancel their own registrations"
    ON public.registrations FOR UPDATE
    TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- ATTENDANCE RLS
DROP POLICY IF EXISTS "Organizers and Admins can view attendance" ON public.attendance;
CREATE POLICY "Organizers and Admins can view attendance"
    ON public.attendance FOR SELECT
    TO authenticated
    USING (public.has_role('ORGANIZER') OR public.has_role('ADMIN'));

DROP POLICY IF EXISTS "Organizers and Admins can record attendance" ON public.attendance;
CREATE POLICY "Organizers and Admins can record attendance"
    ON public.attendance FOR INSERT
    TO authenticated
    WITH CHECK (public.has_role('ORGANIZER') OR public.has_role('ADMIN'));
