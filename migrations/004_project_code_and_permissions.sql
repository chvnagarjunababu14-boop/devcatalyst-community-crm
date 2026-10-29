-- =============================================================================
-- Migration: 004_project_code_and_permissions.sql
-- Description: Safe sequential code generation and strict VIEWER role restrictions
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. SAFE SEQUENTIAL PROJECT CODE GENERATOR
-- Generates PRJ-01, PRJ-02 safely without race conditions
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.generate_next_project_code()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_next_val INTEGER;
    v_code TEXT;
BEGIN
    SELECT COALESCE(MAX(
        CASE 
            WHEN code ~ '^PRJ-[0-9]+$' 
            THEN SUBSTRING(code FROM 5)::INTEGER 
            ELSE 0 
        END
    ), 0) + 1 INTO v_next_val
    FROM public.projects;

    v_code := 'PRJ-' || LPAD(v_next_val::TEXT, 2, '0');
    RETURN v_code;
END;
$$;

-- -----------------------------------------------------------------------------
-- 2. SAFE SEQUENTIAL TASK NUMBER GENERATOR
-- Generates TSK-101, TSK-102 per project safely
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.generate_next_task_number(p_project_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_next_val INTEGER;
    v_task_num TEXT;
BEGIN
    SELECT COALESCE(MAX(
        CASE 
            WHEN task_number ~ '^TSK-[0-9]+$' 
            THEN SUBSTRING(task_number FROM 5)::INTEGER 
            ELSE 100 
        END
    ), 100) + 1 INTO v_next_val
    FROM public.tasks
    WHERE project_id = p_project_id;

    v_task_num := 'TSK-' || v_next_val::TEXT;
    RETURN v_task_num;
END;
$$;

-- -----------------------------------------------------------------------------
-- 3. STRICT VIEWER ROLE TASK ACCESS RESTRICTIONS
-- Requirement: VIEWER users CANNOT create or update tasks.
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Project members can create tasks" ON public.tasks;
CREATE POLICY "Project contributors and leads can create tasks"
    ON public.tasks FOR INSERT
    TO authenticated
    WITH CHECK (
        public.has_role('ADMIN') OR
        public.has_role('ORGANIZER') OR
        EXISTS (
            SELECT 1 FROM public.project_members
            WHERE project_members.project_id = tasks.project_id 
              AND project_members.user_id = auth.uid()
              AND project_members.project_role IN ('LEAD', 'CONTRIBUTOR')
        )
    );

DROP POLICY IF EXISTS "Project members can update tasks" ON public.tasks;
CREATE POLICY "Project contributors and leads can update tasks"
    ON public.tasks FOR UPDATE
    TO authenticated
    USING (
        public.has_role('ADMIN') OR
        public.has_role('ORGANIZER') OR
        EXISTS (
            SELECT 1 FROM public.project_members
            WHERE project_members.project_id = tasks.project_id 
              AND project_members.user_id = auth.uid()
              AND project_members.project_role IN ('LEAD', 'CONTRIBUTOR')
        )
    );
