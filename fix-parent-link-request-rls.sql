-- ============================================================
-- POLARIS — Fix parent_link_requests INSERT policy
-- Run in the Supabase SQL editor.
--
-- YOU MUST RUN THIS FILE IN SUPABASE for the "Send link request"
-- button to work. Do not assume add-parent-link-requests.sql was
-- already applied — this file supersedes its INSERT/UPDATE policies
-- with a corrected version below, and is safe to run whether or not
-- the original file was run (everything here is DROP-then-CREATE).
--
-- ROOT CAUSE of "new row violates row-level security policy for
-- table 'parent_link_requests'":
-- The old INSERT policy's WITH CHECK included:
--   EXISTS (SELECT 1 FROM public.students s WHERE s.id = student_id AND s.parent_id IS NULL)
-- That subquery is evaluated with the CALLING PARENT's own privileges,
-- so it is itself subject to students' "Student row access" SELECT
-- policy (supabase-setup.sql) — which only lets a user read a student
-- row where they are that student, that student's tutor, that
-- student's parent, or an admin. For an UNLINKED student (parent_id
-- IS NULL), a random parent matches none of those, so the subquery
-- always returns zero rows and EXISTS is always false — meaning the
-- INSERT was rejected for every parent, every time, regardless of
-- whether the student was actually unlinked. This is not something a
-- client-side fix can work around; it requires bypassing students'
-- RLS specifically for this one check, safely, via a SECURITY DEFINER
-- function (the same technique already used by search_unlinked_students
-- in add-parent-link-requests.sql).
-- ============================================================

-- Narrow SECURITY DEFINER helper: returns true only if the given
-- student exists and has no parent linked yet. Runs with the
-- function owner's privileges so it can see the students row
-- regardless of the calling parent's own RLS visibility — but it
-- returns nothing except a boolean, so it exposes no student data.
CREATE OR REPLACE FUNCTION public.is_student_unlinked(p_student_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.students WHERE id = p_student_id AND parent_id IS NULL
  );
$$;

REVOKE ALL ON FUNCTION public.is_student_unlinked(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_student_unlinked(uuid) TO authenticated;

-- Corrected INSERT policy: a parent can create a request only for
-- themselves (auth.uid() = parent_id — unchanged, unrelated to the bug)
-- targeting a student who is actually unlinked, now checked via the
-- helper function above instead of a subquery blocked by students' own
-- RLS. This still does NOT let a parent set someone else's parent_id,
-- approve their own request, or touch students.parent_id directly —
-- only admin-only policies (defined in add-parent-link-requests.sql)
-- can do either of those.
DROP POLICY IF EXISTS "parent_create_own_link_request" ON public.parent_link_requests;
CREATE POLICY "parent_create_own_link_request"
  ON public.parent_link_requests FOR INSERT
  WITH CHECK (
    auth.uid() = parent_id
    AND public.is_student_unlinked(student_id)
  );

-- Same bug existed in the resubmit-after-rejection policy — same fix.
DROP POLICY IF EXISTS "parent_resubmit_own_rejected_request" ON public.parent_link_requests;
CREATE POLICY "parent_resubmit_own_rejected_request"
  ON public.parent_link_requests FOR UPDATE
  USING (auth.uid() = parent_id AND status = 'rejected')
  WITH CHECK (
    auth.uid() = parent_id
    AND status = 'pending'
    AND public.is_student_unlinked(student_id)
  );
