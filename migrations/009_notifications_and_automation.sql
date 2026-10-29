-- =============================================================================
-- Migration 009: Notifications and Event Automation
-- DevCatalyst Hub — Reliable Asynchronous Notification Delivery & Auditing
-- Dependencies: 001 through 008
-- =============================================================================
-- Purpose:
-- 1. Creates `public.notifications` table for event RSVPs and recruitment updates.
-- 2. Enforces unique idempotency keys to prevent duplicate email transmissions.
-- 3. Implements status lifecycle: PENDING, SENT, FAILED, RETRYABLE.
-- 4. Enables Row-Level Security ensuring user privacy and administrative oversight.
-- =============================================================================

-- 1. Create Notifications Table
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    idempotency_key TEXT UNIQUE NOT NULL,
    event_type TEXT NOT NULL,
    recipient_email TEXT NOT NULL,
    recipient_name TEXT,
    subject TEXT NOT NULL,
    body_html TEXT NOT NULL,
    body_text TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'SENT', 'FAILED', 'RETRYABLE')),
    delivery_attempts INTEGER NOT NULL DEFAULT 0,
    max_attempts INTEGER NOT NULL DEFAULT 3,
    last_attempt_at TIMESTAMPTZ,
    sent_at TIMESTAMPTZ,
    error_message TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Optimization Indexes
CREATE INDEX IF NOT EXISTS idx_notifications_idempotency_key ON public.notifications(idempotency_key);
CREATE INDEX IF NOT EXISTS idx_notifications_recipient_email ON public.notifications(lower(recipient_email));
CREATE INDEX IF NOT EXISTS idx_notifications_status ON public.notifications(status);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications(created_at DESC);

-- 3. Enable Row-Level Security
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Policy A: Administrators and Organizers can view all dispatch records
DROP POLICY IF EXISTS "Admins and Organizers can view all notifications" ON public.notifications;
CREATE POLICY "Admins and Organizers can view all notifications"
    ON public.notifications FOR SELECT
    TO authenticated
    USING (
        public.has_role('ADMIN') OR
        public.has_role('ORGANIZER')
    );

-- Policy B: Authenticated recipients can view notifications addressed to their verified email
DROP POLICY IF EXISTS "Users can view their own notifications" ON public.notifications;
CREATE POLICY "Users can view their own notifications"
    ON public.notifications FOR SELECT
    TO authenticated
    USING (
        lower(recipient_email) = lower(auth.jwt()->>'email') OR
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid() AND lower(profiles.email) = lower(notifications.recipient_email)
        )
    );

-- Policy C: Modification (insert/update) restricted to Administrators / Serverless Service Role
DROP POLICY IF EXISTS "Only Admins can insert notifications" ON public.notifications;
CREATE POLICY "Only Admins can insert notifications"
    ON public.notifications FOR INSERT
    TO authenticated
    WITH CHECK (
        public.has_role('ADMIN') OR
        public.has_role('ORGANIZER')
    );

DROP POLICY IF EXISTS "Only Admins can update notifications" ON public.notifications;
CREATE POLICY "Only Admins can update notifications"
    ON public.notifications FOR UPDATE
    TO authenticated
    USING (
        public.has_role('ADMIN') OR
        public.has_role('ORGANIZER')
    )
    WITH CHECK (
        public.has_role('ADMIN') OR
        public.has_role('ORGANIZER')
    );
