-- ============================================================
-- POLARIS — Session booking fix
-- Run in the Supabase SQL editor.
--
-- Root cause: public.sessions has RLS enabled (supabase-setup.sql) with
-- a SELECT policy and an UPDATE policy (add-unmatch-support.sql), but
-- NO INSERT policy was ever created. With RLS enabled and no matching
-- policy, every INSERT is denied by default — so a tutor's "Book
-- session" (DB.createSession -> sessions.insert(...)) was always
-- rejected by the database. The app does surface DB errors in the
-- booking form now, but no client-side fix can substitute for the
-- missing policy.
-- ============================================================

DROP POLICY IF EXISTS "Session insert access" ON public.sessions;
CREATE POLICY "Session insert access"
  ON public.sessions FOR INSERT
  WITH CHECK (
    auth.uid() = tutor_id
    AND EXISTS (
      SELECT 1 FROM public.students
      WHERE students.id        = sessions.student_id
        AND students.tutor_id  = sessions.tutor_id
    )
  );
