-- =============================================================================
-- Migration: 001_initial_schema.sql
-- Description: Foundation schema for DevCatalyst Hub (Profiles, Roles, Projects, Members, Tasks)
-- Constraints: Strict UUIDs, foreign keys, timestamps, indexes, and assignee validation
-- =============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- -----------------------------------------------------------------------------
-- 1. PROFILES TABLE
-- Linked directly to auth.users. Stores public and club-authorized member metadata.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL UNIQUE,
    full_name TEXT NOT NULL,
    avatar_url TEXT,
    bio TEXT,
    github_handle TEXT,
    phone TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_github ON public.profiles(github_handle);

-- -----------------------------------------------------------------------------
-- 2. USER ROLES TABLE
-- Supports multiple roles per user (e.g. ORGANIZER + PROJECT_LEAD).
-- Protected from self-escalation by RLS.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('ADMIN', 'ORGANIZER', 'PROJECT_LEAD', 'MEMBER', 'PARTICIPANT')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT uq_user_roles UNIQUE (user_id, role)
);

CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON public.user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role ON public.user_roles(role);

-- -----------------------------------------------------------------------------
-- 3. PROJECTS TABLE
-- Club engineering and operational initiatives.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT NOT NULL UNIQUE, -- e.g. 'PRJ-01'
    title TEXT NOT NULL,
    description TEXT,
    status TEXT NOT NULL DEFAULT 'ACTIVE' 
        CHECK (status IN ('PLANNING', 'ACTIVE', 'COMPLETED', 'ON_HOLD', 'ARCHIVED')),
    lead_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    start_date DATE,
    target_date DATE,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_projects_status ON public.projects(status);
CREATE INDEX IF NOT EXISTS idx_projects_lead_id ON public.projects(lead_id);
CREATE INDEX IF NOT EXISTS idx_projects_code ON public.projects(code);

-- -----------------------------------------------------------------------------
-- 4. PROJECT MEMBERS TABLE
-- Associates profiles with projects with explicit project-level roles.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.project_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    project_role TEXT NOT NULL DEFAULT 'CONTRIBUTOR'
        CHECK (project_role IN ('LEAD', 'CONTRIBUTOR', 'VIEWER')),
    joined_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT uq_project_members UNIQUE (project_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_project_members_project_id ON public.project_members(project_id);
CREATE INDEX IF NOT EXISTS idx_project_members_user_id ON public.project_members(user_id);

-- -----------------------------------------------------------------------------
-- 5. TASKS TABLE
-- Project work units for Kanban boards.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    task_number TEXT NOT NULL, -- e.g. 'TSK-101'
    title TEXT NOT NULL,
    description TEXT,
    status TEXT NOT NULL DEFAULT 'TODO' 
        CHECK (status IN ('TODO', 'IN_PROGRESS', 'DONE')),
    priority TEXT NOT NULL DEFAULT 'MEDIUM' 
        CHECK (priority IN ('LOW', 'MEDIUM', 'HIGH')),
    assignee_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    due_date TIMESTAMPTZ,
    position INTEGER NOT NULL DEFAULT 0,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT uq_project_task_number UNIQUE (project_id, task_number)
);

CREATE INDEX IF NOT EXISTS idx_tasks_project_id ON public.tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_tasks_assignee_id ON public.tasks(assignee_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON public.tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_priority ON public.tasks(priority);

-- -----------------------------------------------------------------------------
-- 6. TASK ASSIGNEE MEMBERSHIP VALIDATION TRIGGER
-- Strict invariant: Task assignee must be an existing member of the project.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.validate_task_assignee_membership()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF NEW.assignee_id IS NOT NULL THEN
        IF NOT EXISTS (
            SELECT 1 FROM public.project_members 
            WHERE project_id = NEW.project_id AND user_id = NEW.assignee_id
        ) THEN
            RAISE EXCEPTION 'Task assignee % must be a member of project %', NEW.assignee_id, NEW.project_id;
        END IF;
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_task_assignee ON public.tasks;
CREATE TRIGGER trg_validate_task_assignee
    BEFORE INSERT OR UPDATE OF assignee_id, project_id
    ON public.tasks
    FOR EACH ROW
    EXECUTE FUNCTION public.validate_task_assignee_membership();
