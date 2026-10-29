-- =============================================================================
-- Migration: 003_bootstrap_admin.sql
-- Description: Secure procedure for bootstrapping the initial ADMIN account.
-- Security Guarantees:
--   1. Can ONLY be executed when ZERO administrators currently exist in the database.
--   2. Strict fixed search path prevents search-path hijacking.
--   3. Revoked from public/anonymous roles; executable only by postgres/service_role.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.bootstrap_initial_admin(p_admin_email TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id UUID;
    v_existing_admin_count INTEGER;
    v_user_name TEXT;
BEGIN
    -- 1. Check if an administrator already exists
    SELECT count(*) INTO v_existing_admin_count 
    FROM public.user_roles 
    WHERE role = 'ADMIN';

    IF v_existing_admin_count > 0 THEN
        RAISE EXCEPTION 'Bootstrapping aborted: % administrator account(s) already exist. Additional admins must be designated through the authorized admin workflow.', v_existing_admin_count;
    END IF;

    -- 2. Lookup the user ID from auth.users
    SELECT id, COALESCE(raw_user_meta_data->>'name', p_admin_email) 
    INTO v_user_id, v_user_name
    FROM auth.users
    WHERE email = LOWER(TRIM(p_admin_email));

    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'No registered user found with email: %. The user must sign up through standard registration before being bootstrapped.', p_admin_email;
    END IF;

    -- 3. Ensure profile exists
    INSERT INTO public.profiles (id, email, full_name, bio, created_at, updated_at)
    VALUES (
        v_user_id,
        LOWER(TRIM(p_admin_email)),
        v_user_name,
        'Initial System Administrator',
        now(),
        now()
    )
    ON CONFLICT (id) DO UPDATE 
    SET updated_at = now();

    -- 4. Assign ADMIN and ORGANIZER roles
    INSERT INTO public.user_roles (user_id, role)
    VALUES 
        (v_user_id, 'ADMIN'),
        (v_user_id, 'ORGANIZER')
    ON CONFLICT (user_id, role) DO NOTHING;

    RETURN jsonb_build_object(
        'success', true,
        'user_id', v_user_id,
        'email', p_admin_email,
        'roles_assigned', jsonb_build_array('ADMIN', 'ORGANIZER'),
        'timestamp', now()
    );
END;
$$;

-- Restrict execution permissions strictly to service role and database superuser
REVOKE ALL ON FUNCTION public.bootstrap_initial_admin(TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.bootstrap_initial_admin(TEXT) FROM anon;
REVOKE ALL ON FUNCTION public.bootstrap_initial_admin(TEXT) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.bootstrap_initial_admin(TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.bootstrap_initial_admin(TEXT) TO postgres;
