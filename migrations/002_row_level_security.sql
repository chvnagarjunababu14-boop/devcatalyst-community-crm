-- =============================================================================
-- Migration: 002_row_level_security.sql
-- Description: Row-Level Security (RLS) policies enforcing least privilege and
--              cross-project data isolation.
-- =============================================================================

-- Enable Row-Level Security on all foundation tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

-- -----------------------------------------------------------------------------
-- Helper Function: Check User Role Safely (Avoiding Recursive RLS)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.has_role(p_role TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.user_roles
        WHERE user_id = auth.uid() AND (role = p_role OR role = 'ADMIN')
    );
$$;

-- -----------------------------------------------------------------------------
-- 1. PROFILES POLICIES
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Profiles are readable by authenticated users" ON public.profiles;
CREATE POLICY "Profiles are readable by authenticated users"
    ON public.profiles FOR SELECT
    TO authenticated
    USING (true);

DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
CREATE POLICY "Users can insert their own profile"
    ON public.profiles FOR INSERT
    TO authenticated
    WITH CHECK (id = auth.uid());

DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile"
    ON public.profiles FOR UPDATE
    TO authenticated
    USING (id = auth.uid())
    WITH CHECK (id = auth.uid());

-- -----------------------------------------------------------------------------
-- 2. USER ROLES POLICIES (Guarding against privilege escalation)
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Roles are readable by authenticated users" ON public.user_roles;
CREATE POLICY "Roles are readable by authenticated users"
    ON public.user_roles FOR SELECT
    TO authenticated
    USING (true);

-- Only ADMINs can grant or revoke roles
DROP POLICY IF EXISTS "Only Admins can insert roles" ON public.user_roles;
CREATE POLICY "Only Admins can insert roles"
    ON public.user_roles FOR INSERT
    TO authenticated
    WITH CHECK (public.has_role('ADMIN'));

DROP POLICY IF EXISTS "Only Admins can update roles" ON public.user_roles;
CREATE POLICY "Only Admins can update roles"
    ON public.user_roles FOR UPDATE
    TO authenticated
    USING (public.has_role('ADMIN'))
    WITH CHECK (public.has_role('ADMIN'));

DROP POLICY IF EXISTS "Only Admins can delete roles" ON public.user_roles;
CREATE POLICY "Only Admins can delete roles"
    ON public.user_roles FOR DELETE
    TO authenticated
    USING (public.has_role('ADMIN'));

-- -----------------------------------------------------------------------------
-- 3. PROJECTS POLICIES
-- -----------------------------------------------------------------------------
-- Projects are visible to ADMINs, ORGANIZERs, or assigned project members
DROP POLICY IF EXISTS "Projects visible to members and leaders" ON public.projects;
CREATE POLICY "Projects visible to members and leaders"
    ON public.projects FOR SELECT
    TO authenticated
    USING (
        public.has_role('ADMIN') OR
        public.has_role('ORGANIZER') OR
        EXISTS (
            SELECT 1 FROM public.project_members
            WHERE project_members.project_id = projects.id 
              AND project_members.user_id = auth.uid()
        )
    );

-- Only ADMIN and ORGANIZER can create projects
DROP POLICY IF EXISTS "Admins and Organizers can create projects" ON public.projects;
CREATE POLICY "Admins and Organizers can create projects"
    ON public.projects FOR INSERT
    TO authenticated
    WITH CHECK (public.has_role('ADMIN') OR public.has_role('ORGANIZER'));

-- Project Leads, Admins, and Organizers can update project details
DROP POLICY IF EXISTS "Leads and leadership can update projects" ON public.projects;
CREATE POLICY "Leads and leadership can update projects"
    ON public.projects FOR UPDATE
    TO authenticated
    USING (
        public.has_role('ADMIN') OR
        public.has_role('ORGANIZER') OR
        lead_id = auth.uid() OR
        EXISTS (
            SELECT 1 FROM public.project_members
            WHERE project_members.project_id = projects.id 
              AND project_members.user_id = auth.uid() 
              AND project_members.project_role = 'LEAD'
        )
    );

-- Only Admins can delete projects
DROP POLICY IF EXISTS "Only Admins can delete projects" ON public.projects;
CREATE POLICY "Only Admins can delete projects"
    ON public.projects FOR DELETE
    TO authenticated
    USING (public.has_role('ADMIN'));

-- -----------------------------------------------------------------------------
-- 4. PROJECT MEMBERS POLICIES
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Project members visible to project participants and leadership" ON public.project_members;
CREATE POLICY "Project members visible to project participants and leadership"
    ON public.project_members FOR SELECT
    TO authenticated
    USING (
        public.has_role('ADMIN') OR
        public.has_role('ORGANIZER') OR
        EXISTS (
            SELECT 1 FROM public.project_members pm
            WHERE pm.project_id = project_members.project_id 
              AND pm.user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Leads and leadership can manage project members" ON public.project_members;
CREATE POLICY "Leads and leadership can manage project members"
    ON public.project_members FOR ALL
    TO authenticated
    USING (
        public.has_role('ADMIN') OR
        public.has_role('ORGANIZER') OR
        EXISTS (
            SELECT 1 FROM public.projects p
            WHERE p.id = project_members.project_id AND p.lead_id = auth.uid()
        )
    );

-- -----------------------------------------------------------------------------
-- 5. TASKS POLICIES
-- -----------------------------------------------------------------------------
-- Tasks visible to members of the project or leadership
DROP POLICY IF EXISTS "Tasks visible to project members" ON public.tasks;
CREATE POLICY "Tasks visible to project members"
    ON public.tasks FOR SELECT
    TO authenticated
    USING (
        public.has_role('ADMIN') OR
        public.has_role('ORGANIZER') OR
        EXISTS (
            SELECT 1 FROM public.project_members
            WHERE project_members.project_id = tasks.project_id 
              AND project_members.user_id = auth.uid()
        )
    );

-- Project members and leadership can create tasks
DROP POLICY IF EXISTS "Project members can create tasks" ON public.tasks;
CREATE POLICY "Project members can create tasks"
    ON public.tasks FOR INSERT
    TO authenticated
    WITH CHECK (
        public.has_role('ADMIN') OR
        public.has_role('ORGANIZER') OR
        EXISTS (
            SELECT 1 FROM public.project_members
            WHERE project_members.project_id = tasks.project_id 
              AND project_members.user_id = auth.uid()
        )
    );

-- Task updates (status, priority, position) permitted to members
DROP POLICY IF EXISTS "Project members can update tasks" ON public.tasks;
CREATE POLICY "Project members can update tasks"
    ON public.tasks FOR UPDATE
    TO authenticated
    USING (
        public.has_role('ADMIN') OR
        public.has_role('ORGANIZER') OR
        assignee_id = auth.uid() OR
        EXISTS (
            SELECT 1 FROM public.project_members
            WHERE project_members.project_id = tasks.project_id 
              AND project_members.user_id = auth.uid()
        )
    );

-- Only leads or leadership can delete tasks
DROP POLICY IF EXISTS "Leads and leadership can delete tasks" ON public.tasks;
CREATE POLICY "Leads and leadership can delete tasks"
    ON public.tasks FOR DELETE
    TO authenticated
    USING (
        public.has_role('ADMIN') OR
        public.has_role('ORGANIZER') OR
        EXISTS (
            SELECT 1 FROM public.projects p
            WHERE p.id = tasks.project_id AND p.lead_id = auth.uid()
        )
    );
