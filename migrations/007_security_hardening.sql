-- =============================================================================
-- Migration: 007_security_hardening.sql
-- Description: Phase 6 Security Hardening, Search Path Sanitization, 
--              Application Ingestion Lockdown, and Role Helper Optimizations.
-- Dependencies: 001 through 006
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. SEARCH PATH HARDENING: submit_recruitment_application
-- Fix: Explicitly bind search_path = public, pg_temp on SECURITY DEFINER function
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
SET search_path = public, pg_temp
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

-- Allow public and authenticated callers to execute the submission procedure
GRANT EXECUTE ON FUNCTION public.submit_recruitment_application TO public;
GRANT EXECUTE ON FUNCTION public.submit_recruitment_application TO anon;
GRANT EXECUTE ON FUNCTION public.submit_recruitment_application TO authenticated;

-- -----------------------------------------------------------------------------
-- 2. LOCK DOWN DIRECT INSERT ON public.applications
-- Fix: Prevent arbitrary unvalidated inserts directly to public.applications.
-- Anonymous applicants must use submit_recruitment_application.
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "applications_public_insert" ON public.applications;

-- Direct inserts on applications are restricted to reviewers / administrators only
CREATE POLICY "applications_reviewer_insert" ON public.applications
    FOR INSERT TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.user_roles 
            WHERE user_id = auth.uid() AND role IN ('ADMIN', 'ORGANIZER', 'PROJECT_LEAD')
        )
    );

-- -----------------------------------------------------------------------------
-- 3. TIGHTEN MEMBER METADATA RLS
-- Fix: Regular members can only update their personal bio/skills/interests,
-- not their lifecycle membership_status or domain assignments.
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "member_metadata_admin_manage" ON public.member_metadata;

-- Full management (status, domains, application_id) restricted to ADMIN & ORGANIZER
CREATE POLICY "member_metadata_leadership_manage" ON public.member_metadata
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.user_roles 
            WHERE user_id = auth.uid() AND role IN ('ADMIN', 'ORGANIZER')
        )
    );

-- Users can insert their own initial metadata record if missing
CREATE POLICY "member_metadata_user_insert_own" ON public.member_metadata
    FOR INSERT TO authenticated
    WITH CHECK (
        user_id = auth.uid() AND
        membership_status = 'ACTIVE'
    );

-- -----------------------------------------------------------------------------
-- 4. VARIADIC MULTI-ROLE CHECK FUNCTION
-- Optimizes policy evaluation and simplifies multi-role authorization checks.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.has_any_role(VARIADIC p_roles TEXT[])
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.user_roles
        WHERE user_id = auth.uid() 
          AND (role = ANY(p_roles) OR role = 'ADMIN')
    );
$$;

GRANT EXECUTE ON FUNCTION public.has_any_role TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_any_role TO service_role;

-- -----------------------------------------------------------------------------
-- 5. SECURE MEMBER CONTACT VIEW (Column-Level Privacy Hardening)
-- Strips phone numbers for non-administrators at the SQL query layer
-- -----------------------------------------------------------------------------
CREATE OR REPLACE VIEW public.member_directory_view AS
SELECT 
    p.id,
    CASE 
        WHEN auth.uid() IS NOT NULL THEN p.email
        ELSE substr(p.email, 1, 3) || '***@devcatalyst.club'
    END AS email,
    p.full_name,
    p.avatar_url,
    p.bio,
    p.github_handle,
    CASE 
        WHEN public.has_any_role('ADMIN', 'ORGANIZER') THEN p.phone
        ELSE NULL
    END AS phone,
    COALESCE(m.membership_status, 'ACTIVE') AS membership_status,
    COALESCE(m.domains, '{"ENGINEERING"}') AS domains,
    COALESCE(m.skills, '{}') AS skills,
    COALESCE(m.interests, '{}') AS interests,
    COALESCE(m.joined_at, p.created_at) AS joined_at,
    m.department,
    m.year_of_study
FROM public.profiles p
LEFT JOIN public.member_metadata m ON m.user_id = p.id;

-- Grant select to authenticated and public
GRANT SELECT ON public.member_directory_view TO authenticated;
GRANT SELECT ON public.member_directory_view TO anon;
