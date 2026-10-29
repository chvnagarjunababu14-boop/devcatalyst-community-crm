-- =============================================================================
-- Migration 008: Public Projects Visibility & Discovery
-- DevCatalyst Hub — Public Discovery Extension
-- =============================================================================
-- Purpose:
-- 1. Adds `is_public` boolean column to public.projects (default false).
-- 2. Establishes RLS policy allowing anonymous & public users to view approved
--    public club projects without exposing internal tasks or members.
-- 3. Sets is_public = true on flagship showcase projects (PRJ-01, PRJ-02).
-- =============================================================================

-- 1. Add is_public column to projects if not already present
ALTER TABLE public.projects 
ADD COLUMN IF NOT EXISTS is_public BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_projects_is_public ON public.projects(is_public) WHERE is_public = true;

-- 2. Allow anonymous and authenticated users to read approved public projects
DROP POLICY IF EXISTS "Public projects visible to everyone" ON public.projects;
CREATE POLICY "Public projects visible to everyone"
    ON public.projects FOR SELECT
    TO anon, authenticated
    USING (is_public = true AND status IN ('ACTIVE', 'COMPLETED'));

-- 3. Flag existing flagship initiatives for public club discovery
UPDATE public.projects 
SET is_public = true 
WHERE code IN ('PRJ-01', 'PRJ-02');
