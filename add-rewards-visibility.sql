-- ============================================================
-- NUKHBA — Rewards + per-reward student allowlist
-- Run in the Supabase SQL editor.
-- ============================================================
--
-- The `rewards` table already exists (referenced throughout app.js /
-- supabase.js: name, cost_points, is_active) but isn't defined in any
-- tracked SQL file, so its exact column set is unknown here — the
-- CREATE TABLE IF NOT EXISTS + ADD COLUMN IF NOT EXISTS pair below is
-- safe whether it already exists or not (same pattern as
-- fix-tutors-schema.sql).

CREATE TABLE IF NOT EXISTS public.rewards (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at  timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.rewards ADD COLUMN IF NOT EXISTS name        text NOT NULL DEFAULT '';
ALTER TABLE public.rewards ADD COLUMN IF NOT EXISTS description text;
ALTER TABLE public.rewards ADD COLUMN IF NOT EXISTS cost_points integer NOT NULL DEFAULT 0;
ALTER TABLE public.rewards ADD COLUMN IF NOT EXISTS is_active   boolean NOT NULL DEFAULT true;
ALTER TABLE public.rewards ALTER COLUMN name DROP DEFAULT;
ALTER TABLE public.rewards ALTER COLUMN cost_points DROP DEFAULT;

-- 1. Per-reward student allowlist.
CREATE TABLE IF NOT EXISTS public.reward_visibility (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  reward_id  uuid        NOT NULL REFERENCES public.rewards(id)  ON DELETE CASCADE,
  student_id uuid        NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (reward_id, student_id)
);
CREATE INDEX IF NOT EXISTS reward_visibility_student_idx ON public.reward_visibility(student_id);

-- 2. RLS on rewards: admins manage everything; a student may only
-- read active rewards they've been explicitly granted. This is the
-- actual enforcement point for "a student only sees rewards they've
-- been granted" — the existing student query
-- (.from('rewards').select('*').eq('is_active', true)) doesn't need
-- to change at all, it will simply return fewer rows once this is in
-- place.
ALTER TABLE public.rewards ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Rewards admin manage" ON public.rewards;
DROP POLICY IF EXISTS "Rewards student read granted" ON public.rewards;

CREATE POLICY "Rewards admin manage"
  ON public.rewards FOR ALL
  USING       ((SELECT role FROM public.users WHERE id = auth.uid()) = 'admin')
  WITH CHECK  ((SELECT role FROM public.users WHERE id = auth.uid()) = 'admin');

CREATE POLICY "Rewards student read granted"
  ON public.rewards FOR SELECT
  USING (
    is_active = true
    AND EXISTS (
      SELECT 1 FROM public.reward_visibility rv
      WHERE rv.reward_id = rewards.id AND rv.student_id = auth.uid()
    )
  );

-- 3. RLS on reward_visibility: admin manages the allowlist; a student
-- may read which rewards they've been granted (not strictly needed by
-- the current UI, but harmless and useful for future use).
ALTER TABLE public.reward_visibility ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Reward visibility admin manage" ON public.reward_visibility;
DROP POLICY IF EXISTS "Reward visibility student read own" ON public.reward_visibility;

CREATE POLICY "Reward visibility admin manage"
  ON public.reward_visibility FOR ALL
  USING       ((SELECT role FROM public.users WHERE id = auth.uid()) = 'admin')
  WITH CHECK  ((SELECT role FROM public.users WHERE id = auth.uid()) = 'admin');

CREATE POLICY "Reward visibility student read own"
  ON public.reward_visibility FOR SELECT
  USING (auth.uid() = student_id);

-- ── VERIFICATION ─────────────────────────────────────────────
-- 1. Log in as admin → Rewards tab → create a reward → it should NOT
--    appear in any student's store yet.
-- 2. Grant it to one specific student (Manage access) → only that
--    student's Points & rewards store should show it; other students
--    should still see the "waiting for teacher to set up" empty state.
-- 3. Reward redemption (reward_requests → admin approval) is
--    unchanged by this file.
