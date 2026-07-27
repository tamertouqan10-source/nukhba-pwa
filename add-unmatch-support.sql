-- ============================================================
-- NUKHBA — Unmatch (student <-> tutor) support
-- Run in the Supabase SQL editor.
-- ============================================================

-- 1. match_requests.status needs an 'ended' value.
-- The original CHECK (add-tender-matching.sql) only allows
-- 'pending' | 'accepted' | 'declined'. unmatchPair() in supabase.js
-- moves an accepted request to 'ended' so the pair's history is kept
-- and the RLS-visible row count stays > 0 (checkStudentGate() in
-- app.js counts ANY match_requests row for the student, so keeping
-- this row — instead of deleting it — is what prevents the full-screen
-- "choose a tutor" overlay from reappearing right after an unmatch).
ALTER TABLE public.match_requests DROP CONSTRAINT IF EXISTS match_requests_status_check;
ALTER TABLE public.match_requests ADD CONSTRAINT match_requests_status_check
  CHECK (status IN ('pending', 'accepted', 'declined', 'ended'));

-- 2. sessions: allow the student or the tutor in a pair to cancel
-- their own upcoming sessions (unmatchPair() sets status = 'cancelled'
-- on any 'upcoming' session between the two). No UPDATE policy on
-- sessions is defined in the tracked SQL files, only SELECT — add an
-- explicit one here rather than assume what already exists in the
-- dashboard. Multiple permissive policies are OR'd together by
-- Postgres RLS, so this is additive/safe even if a broader tutor-only
-- policy already exists elsewhere.
--
-- WITH CHECK deliberately only allows a non-admin to land the row on
-- 'cancelled' — this feature never needs a student or tutor to set
-- any other status via direct UPDATE. Without that restriction, a
-- student could call the Supabase REST API directly (bypassing the
-- app) to set their own session to status = 'completed' with a
-- fabricated scheduled_at, inflating the attendance_streak trigger
-- added in add-weekly-streak.sql.
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Session update access" ON public.sessions;
CREATE POLICY "Session update access"
  ON public.sessions FOR UPDATE
  USING (
    auth.uid() = student_id
    OR auth.uid() = tutor_id
    OR (SELECT role FROM public.users WHERE id = auth.uid()) = 'admin'
  )
  WITH CHECK (
    (SELECT role FROM public.users WHERE id = auth.uid()) = 'admin'
    OR status = 'cancelled'
  );

-- ── VERIFICATION ─────────────────────────────────────────────
-- 1. As a student with an assigned tutor: Dashboard → "Remove tutor" →
--    confirm. students.tutor_id should become null, the matching
--    match_requests row should flip to 'ended', and any 'upcoming'
--    session between the two should flip to 'cancelled'. Past
--    ('completed') sessions, session_notes, and homework must be
--    untouched.
-- 2. Reload the student portal — no lock-out, no full-screen overlay.
-- 3. "Find tutors" → the former tutor should now show a
--    "Request again" button instead of "Matched!".
-- 4. As the tutor: My Students → "Remove" on a row does the same from
--    the tutor's side, and the student disappears from the table.
-- 5. As a student, try updating one of your own sessions' status to
--    'completed' directly via the Supabase client/REST API (not
--    through the app) — it should be rejected by RLS; only
--    'cancelled' is allowed for non-admins.
