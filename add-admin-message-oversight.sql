-- ============================================================
-- NUKHBA — Admin message oversight
-- Run in the Supabase SQL editor.
-- ============================================================

-- The existing "Message read access" policy (supabase-setup.sql) only
-- lets the sender or receiver read a row, so the new read-only admin
-- Messages page returns nothing for an admin session. Replace it with
-- a version that also allows role = 'admin' to read every row.

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Message read access" ON public.messages;

CREATE POLICY "Message read access"
  ON public.messages FOR SELECT
  USING (
    auth.uid() = sender_id
    OR auth.uid() = receiver_id
    OR (SELECT role FROM public.users WHERE id = auth.uid()) = 'admin'
  );

-- Insert access is unchanged — admins are read-only, they cannot send.

-- ── VERIFICATION ─────────────────────────────────────────────
-- 1. Log in as admin → Messages tab → conversations from every
--    student/tutor/parent pair should be visible.
-- 2. Log in as a non-admin → should still only see their own messages.
