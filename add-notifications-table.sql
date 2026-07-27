-- ============================================================
-- POLARIS — Notifications table
-- Run in the Supabase SQL editor.
-- After running, enable Realtime for the notifications table:
--   Supabase Dashboard > Database > Replication > Tables > notifications
-- ============================================================

CREATE TABLE IF NOT EXISTS public.notifications (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type       text        NOT NULL
                         CHECK (type IN (
                           'session_reminder_24h',
                           'session_reminder_1h',
                           'homework_due_24h',
                           'homework_due_today'
                         )),
  message    text        NOT NULL,
  related_id uuid,
  is_read    boolean     NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  -- prevents the cron job from creating duplicate notifications
  UNIQUE (user_id, type, related_id)
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Users can read and update (mark read) their own notifications only
CREATE POLICY "own_notifications_select" ON public.notifications
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "own_notifications_update" ON public.notifications
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Inserts are done exclusively by the /api/check-notifications serverless
-- function using the service-role key — no user-facing INSERT policy needed.
