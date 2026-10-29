-- =============================================================================
-- Migration: 006_recruitment_and_members.sql
-- Description: Phase 5 Recruitment Pipeline, Evaluation Scorecards & Member CRM
-- Tables: recruitment_cycles, applications, interviews, scorecards, member_metadata, recruitment_audit_logs
-- Constraints: Non-destructive, partial unique indexes, atomic procedures, and strict RLS
-- =============================================================================

-- Enable uuid extension if needed
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- -----------------------------------------------------------------------------
-- 1. RECRUITMENT CYCLES
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.recruitment_cycles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    term TEXT NOT NULL, -- e.g. 'Spring 2026'
    description TEXT,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    status TEXT NOT NULL DEFAULT 'ACTIVE' 
        CHECK (status IN ('UPCOMING', 'ACTIVE', 'CLOSED', 'ARCHIVED')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT chk_cycle_dates CHECK (end_date >= start_date)
);

CREATE INDEX IF NOT EXISTS idx_recruitment_cycles_status ON public.recruitment_cycles(status);
CREATE INDEX IF NOT EXISTS idx_recruitment_cycles_dates ON public.recruitment_cycles(start_date, end_date);

-- -----------------------------------------------------------------------------
-- 2. APPLICATIONS TABLE
-- Stores applicant submissions across club domains
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.applications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reference_code TEXT NOT NULL UNIQUE, -- e.g. 'APP-2026-8A4F1'
    cycle_id UUID NOT NULL REFERENCES public.recruitment_cycles(id) ON DELETE CASCADE,
    applicant_name TEXT NOT NULL,
    applicant_email TEXT NOT NULL,
    phone TEXT,
    institution TEXT NOT NULL,
    domain TEXT NOT NULL 
        CHECK (domain IN ('ENGINEERING', 'DESIGN', 'OUTREACH', 'PRODUCT', 'OPERATIONS')),
    skills TEXT[] NOT NULL DEFAULT '{}',
    experience_summary TEXT NOT NULL,
    portfolio_url TEXT,
    github_url TEXT,
    motivation TEXT NOT NULL,
    stage TEXT NOT NULL DEFAULT 'APPLIED' 
        CHECK (stage IN ('APPLIED', 'SCREENING', 'INTERVIEW_SCHEDULED', 'INTERVIEWED', 'ACCEPTED', 'REJECTED')),
    reviewer_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    status_notes TEXT, -- Private internal notes, never exposed to applicant
    submitted_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Unique index ensuring at most one active application per email per recruitment cycle
CREATE UNIQUE INDEX IF NOT EXISTS uq_cycle_applicant_email 
    ON public.applications (cycle_id, lower(trim(applicant_email)));

CREATE INDEX IF NOT EXISTS idx_applications_cycle_stage ON public.applications(cycle_id, stage);
CREATE INDEX IF NOT EXISTS idx_applications_domain ON public.applications(domain);
CREATE INDEX IF NOT EXISTS idx_applications_reviewer ON public.applications(reviewer_id);
CREATE INDEX IF NOT EXISTS idx_applications_ref_code ON public.applications(reference_code);

-- -----------------------------------------------------------------------------
-- 3. INTERVIEWS TABLE
-- Scheduling and format for candidate interviews
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.interviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    application_id UUID NOT NULL REFERENCES public.applications(id) ON DELETE CASCADE,
    scheduled_at TIMESTAMPTZ NOT NULL,
    time_zone TEXT NOT NULL DEFAULT 'UTC',
    duration_minutes INTEGER NOT NULL DEFAULT 45 CHECK (duration_minutes > 0),
    format TEXT NOT NULL DEFAULT 'ONLINE' CHECK (format IN ('ONLINE', 'IN_PERSON')),
    meeting_link TEXT,
    venue TEXT,
    interviewer_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    status TEXT NOT NULL DEFAULT 'SCHEDULED' 
        CHECK (status IN ('SCHEDULED', 'COMPLETED', 'RESCHEDULED', 'CANCELLED')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_interviews_application ON public.interviews(application_id);
CREATE INDEX IF NOT EXISTS idx_interviews_interviewer ON public.interviews(interviewer_id);
CREATE INDEX IF NOT EXISTS idx_interviews_scheduled_at ON public.interviews(scheduled_at);

-- -----------------------------------------------------------------------------
-- 4. SCORECARDS TABLE
-- Structured evaluations with rubric criteria and written evidence
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.scorecards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    application_id UUID NOT NULL REFERENCES public.applications(id) ON DELETE CASCADE,
    interview_id UUID REFERENCES public.interviews(id) ON DELETE SET NULL,
    interviewer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    technical_score INTEGER NOT NULL CHECK (technical_score BETWEEN 1 AND 5),
    collaboration_score INTEGER NOT NULL CHECK (collaboration_score BETWEEN 1 AND 5),
    communication_score INTEGER NOT NULL CHECK (communication_score BETWEEN 1 AND 5),
    domain_skill_score INTEGER NOT NULL CHECK (domain_skill_score BETWEEN 1 AND 5),
    overall_score NUMERIC(3, 1) NOT NULL CHECK (overall_score BETWEEN 1.0 AND 5.0),
    written_evidence TEXT NOT NULL,
    recommendation TEXT NOT NULL 
        CHECK (recommendation IN ('STRONG_HIRE', 'HIRE', 'NEUTRAL', 'DO_NOT_HIRE')),
    internal_notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_scorecards_application ON public.scorecards(application_id);
CREATE INDEX IF NOT EXISTS idx_scorecards_interviewer ON public.scorecards(interviewer_id);

-- -----------------------------------------------------------------------------
-- 5. MEMBER METADATA (Extends profiles for Member CRM)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.member_metadata (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
    membership_status TEXT NOT NULL DEFAULT 'ACTIVE' 
        CHECK (membership_status IN ('ACTIVE', 'ALUMNI', 'INACTIVE', 'PROBATION')),
    domains TEXT[] NOT NULL DEFAULT '{"ENGINEERING"}',
    skills TEXT[] NOT NULL DEFAULT '{}',
    interests TEXT[] NOT NULL DEFAULT '{}',
    joined_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    department TEXT,
    year_of_study TEXT,
    application_id UUID REFERENCES public.applications(id) ON DELETE SET NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_member_metadata_user ON public.member_metadata(user_id);
CREATE INDEX IF NOT EXISTS idx_member_metadata_status ON public.member_metadata(membership_status);

-- -----------------------------------------------------------------------------
-- 6. RECRUITMENT AUDIT LOGS
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.recruitment_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    application_id UUID NOT NULL REFERENCES public.applications(id) ON DELETE CASCADE,
    actor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    from_stage TEXT,
    to_stage TEXT,
    reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_recruitment_audit_application ON public.recruitment_audit_logs(application_id);

-- -----------------------------------------------------------------------------
-- 7. ATOMIC STORED PROCEDURE: submit_recruitment_application
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.submit_recruitment_application(
    p_cycle_id UUID,
    p_applicant_name TEXT,
    p_applicant_email TEXT,
    p_phone TEXT,
    p_institution TEXT,
    p_domain TEXT,
    p_skills TEXT[],
    p_experience_summary TEXT,
    p_portfolio_url TEXT,
    p_github_url TEXT,
    p_motivation TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_cycle_record public.recruitment_cycles%ROWTYPE;
    v_clean_email TEXT;
    v_clean_name TEXT;
    v_ref_code TEXT;
    v_app_id UUID;
BEGIN
    v_clean_email := lower(trim(p_applicant_email));
    v_clean_name := trim(p_applicant_name);

    IF length(v_clean_name) < 2 THEN
        RETURN jsonb_build_object('success', false, 'code', 'INVALID_NAME', 'message', 'Applicant name is required');
    END IF;

    IF v_clean_email NOT LIKE '%_@__%.__%' THEN
        RETURN jsonb_build_object('success', false, 'code', 'INVALID_EMAIL', 'message', 'A valid email address is required');
    END IF;

    -- Lock and verify recruitment cycle
    SELECT * INTO v_cycle_record
    FROM public.recruitment_cycles
    WHERE id = p_cycle_id
    FOR SHARE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'code', 'CYCLE_NOT_FOUND', 'message', 'Recruitment cycle does not exist');
    END IF;

    IF v_cycle_record.status != 'ACTIVE' THEN
        RETURN jsonb_build_object('success', false, 'code', 'CYCLE_INACTIVE', 'message', 'Recruitment applications are currently closed for this cycle');
    END IF;

    IF CURRENT_DATE < v_cycle_record.start_date OR CURRENT_DATE > v_cycle_record.end_date THEN
        RETURN jsonb_build_object('success', false, 'code', 'OUTSIDE_CYCLE_DATES', 'message', 'The application window for this recruitment cycle has closed');
    END IF;

    -- Check duplicate application in this cycle
    IF EXISTS (
        SELECT 1 FROM public.applications
        WHERE cycle_id = p_cycle_id AND lower(trim(applicant_email)) = v_clean_email
    ) THEN
        RETURN jsonb_build_object('success', false, 'code', 'DUPLICATE_APPLICATION', 'message', 'An application has already been submitted with this email for the current cycle');
    END IF;

    -- Generate reference code: APP-YEAR-HEX
    v_ref_code := 'APP-' || to_char(now(), 'YYYY') || '-' || upper(substr(md5(random()::text || clock_timestamp()::text), 1, 5));

    INSERT INTO public.applications (
        reference_code,
        cycle_id,
        applicant_name,
        applicant_email,
        phone,
        institution,
        domain,
        skills,
        experience_summary,
        portfolio_url,
        github_url,
        motivation,
        stage,
        submitted_at,
        updated_at
    ) VALUES (
        v_ref_code,
        p_cycle_id,
        v_clean_name,
        v_clean_email,
        trim(p_phone),
        trim(p_institution),
        p_domain,
        COALESCE(p_skills, '{}'),
        trim(p_experience_summary),
        trim(p_portfolio_url),
        trim(p_github_url),
        trim(p_motivation),
        'APPLIED',
        timezone('utc'::text, now()),
        timezone('utc'::text, now())
    )
    RETURNING id INTO v_app_id;

    -- Log initial audit
    INSERT INTO public.recruitment_audit_logs (
        application_id,
        action,
        from_stage,
        to_stage,
        reason
    ) VALUES (
        v_app_id,
        'APPLICATION_SUBMITTED',
        NULL,
        'APPLIED',
        'Applicant submitted public application form'
    );

    -- Return safe outcome without sensitive internal fields
    RETURN jsonb_build_object(
        'success', true,
        'code', 'APPLICATION_SUBMITTED',
        'message', 'Application submitted successfully',
        'reference_code', v_ref_code,
        'domain', p_domain,
        'applicant_name', v_clean_name
    );
END;
$$;

-- -----------------------------------------------------------------------------
-- 8. ROW LEVEL SECURITY POLICIES
-- -----------------------------------------------------------------------------
ALTER TABLE public.recruitment_cycles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.interviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scorecards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.member_metadata ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recruitment_audit_logs ENABLE ROW LEVEL SECURITY;

-- Recruitment Cycles: Anyone can view active/upcoming cycles; Admins/Organizers manage
CREATE POLICY "cycles_public_read" ON public.recruitment_cycles
    FOR SELECT TO public
    USING (status IN ('ACTIVE', 'UPCOMING', 'CLOSED'));

CREATE POLICY "cycles_admin_manage" ON public.recruitment_cycles
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.user_roles 
            WHERE user_id = auth.uid() AND role IN ('ADMIN', 'ORGANIZER')
        )
    );

-- Applications:
-- Reviewers (ADMIN, ORGANIZER, PROJECT_LEAD) can view and update
CREATE POLICY "applications_reviewer_select" ON public.applications
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.user_roles 
            WHERE user_id = auth.uid() AND role IN ('ADMIN', 'ORGANIZER', 'PROJECT_LEAD')
        )
    );

CREATE POLICY "applications_reviewer_update" ON public.applications
    FOR UPDATE TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.user_roles 
            WHERE user_id = auth.uid() AND role IN ('ADMIN', 'ORGANIZER', 'PROJECT_LEAD')
        )
    );

-- Public insert allowed via security-definer procedure submit_recruitment_application
CREATE POLICY "applications_public_insert" ON public.applications
    FOR INSERT TO public
    WITH CHECK (true);

-- Interviews & Scorecards: Strictly reviewer access
CREATE POLICY "interviews_reviewer_all" ON public.interviews
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.user_roles 
            WHERE user_id = auth.uid() AND role IN ('ADMIN', 'ORGANIZER', 'PROJECT_LEAD')
        )
    );

CREATE POLICY "scorecards_reviewer_all" ON public.scorecards
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.user_roles 
            WHERE user_id = auth.uid() AND role IN ('ADMIN', 'ORGANIZER', 'PROJECT_LEAD')
        )
    );

-- Member Metadata: All authenticated club members can read; Admins/Organizers manage
CREATE POLICY "member_metadata_read_authenticated" ON public.member_metadata
    FOR SELECT TO authenticated
    USING (true);

CREATE POLICY "member_metadata_admin_manage" ON public.member_metadata
    FOR ALL TO authenticated
    USING (
        user_id = auth.uid() OR
        EXISTS (
            SELECT 1 FROM public.user_roles 
            WHERE user_id = auth.uid() AND role IN ('ADMIN', 'ORGANIZER')
        )
    );

-- Recruitment Audit Logs: Strictly reviewer view
CREATE POLICY "recruitment_audit_reviewer_view" ON public.recruitment_audit_logs
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.user_roles 
            WHERE user_id = auth.uid() AND role IN ('ADMIN', 'ORGANIZER', 'PROJECT_LEAD')
        )
    );
