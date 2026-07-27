-- ============================================================
-- POLARIS — Parent-student link request/approve flow
-- Run in the Supabase SQL editor.
--
-- Safeguarding requirement: a parent must NEVER be able to set
-- students.parent_id directly — only an admin approving a pending
-- request can create the link. A parent can only ever read data
-- (dashboard/progress/sessions/messages) for the student they are
-- actually linked to via parent_id, never any other student.
-- ============================================================

-- 1. Requests table
CREATE TABLE IF NOT EXISTS public.parent_link_requests (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id   uuid        NOT NULL REFERENCES public.users(id)    ON DELETE CASCADE,
  student_id  uuid        NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  status      text        NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (parent_id, student_id)
);

ALTER TABLE public.parent_link_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "parent_create_own_link_request"       ON public.parent_link_requests;
DROP POLICY IF EXISTS "parent_view_own_link_requests"        ON public.parent_link_requests;
DROP POLICY IF EXISTS "parent_resubmit_own_rejected_request" ON public.parent_link_requests;
DROP POLICY IF EXISTS "admin_view_link_requests"             ON public.parent_link_requests;
DROP POLICY IF EXISTS "admin_update_link_requests"           ON public.parent_link_requests;

-- Parent can create a request only for themselves, targeting a student who
-- isn't already linked to someone (re-checked server-side here, not just
-- trusted from the client — closes a race with another parent's request
-- and stops a parent creating a request against a student who already has
-- a parent).
CREATE POLICY "parent_create_own_link_request"
  ON public.parent_link_requests FOR INSERT
  WITH CHECK (
    auth.uid() = parent_id
    AND EXISTS (SELECT 1 FROM public.students s WHERE s.id = student_id AND s.parent_id IS NULL)
  );

-- Parent can see only their own requests (to show pending/rejected status
-- on their dashboard). They can never approve their own request — that
-- requires role = 'admin', below — but they CAN move their own rejected
-- request back to 'pending' to retry (e.g. after a typo), never straight
-- to 'approved', and only while the student is still unlinked.
CREATE POLICY "parent_view_own_link_requests"
  ON public.parent_link_requests FOR SELECT
  USING (auth.uid() = parent_id);

CREATE POLICY "parent_resubmit_own_rejected_request"
  ON public.parent_link_requests FOR UPDATE
  USING (auth.uid() = parent_id AND status = 'rejected')
  WITH CHECK (
    auth.uid() = parent_id
    AND status = 'pending'
    AND EXISTS (SELECT 1 FROM public.students s WHERE s.id = student_id AND s.parent_id IS NULL)
  );

-- Admin can see all requests.
CREATE POLICY "admin_view_link_requests"
  ON public.parent_link_requests FOR SELECT
  USING ((SELECT role FROM public.users WHERE id = auth.uid()) = 'admin');

-- Only admin can change status (approve/reject).
CREATE POLICY "admin_update_link_requests"
  ON public.parent_link_requests FOR UPDATE
  USING ((SELECT role FROM public.users WHERE id = auth.uid()) = 'admin')
  WITH CHECK ((SELECT role FROM public.users WHERE id = auth.uid()) = 'admin');


-- 2. students.parent_id can only ever be set by an admin.
-- (students already has "Student row access" for SELECT from
-- supabase-setup.sql, and "students_tutor_id_by_requested_tutor" for
-- UPDATE from fix-tutor-visibility.sql — neither lets anyone touch
-- parent_id. This adds the admin-only UPDATE path used for approve/unlink.)
DROP POLICY IF EXISTS "admin_update_students" ON public.students;
CREATE POLICY "admin_update_students"
  ON public.students FOR UPDATE
  USING ((SELECT role FROM public.users WHERE id = auth.uid()) = 'admin')
  WITH CHECK ((SELECT role FROM public.users WHERE id = auth.uid()) = 'admin');


-- 3. Narrow search for the parent-linking autocomplete. Returns ONLY
-- id + full_name, only for students with no parent yet, and only to an
-- approved parent caller. Runs SECURITY DEFINER specifically so it can
-- see across the students table (which a not-yet-linked parent otherwise
-- cannot read at all under "Student row access"), while staying scoped
-- to exactly this narrow slice — never grades, subjects, tutor_id, goals,
-- or any other student data, and never students who already have a parent.
CREATE OR REPLACE FUNCTION public.search_unlinked_students(search_term text)
RETURNS TABLE(student_id uuid, full_name text)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT s.id, u.full_name
  FROM public.students s
  JOIN public.users u ON u.id = s.id
  WHERE s.parent_id IS NULL
    AND u.full_name ILIKE '%' || search_term || '%'
    AND EXISTS (
      SELECT 1 FROM public.users caller
      WHERE caller.id = auth.uid() AND caller.role = 'parent' AND caller.is_approved = true
    )
  ORDER BY u.full_name
  LIMIT 10;
$$;

REVOKE ALL ON FUNCTION public.search_unlinked_students(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.search_unlinked_students(text) TO authenticated;


-- 4. Let a linked parent read their child's sessions (dashboard stats +
-- Sessions page). Extends the existing "Session read access" policy from
-- supabase-setup.sql — same policy name, replaced in place.
DROP POLICY IF EXISTS "Session read access" ON public.sessions;
CREATE POLICY "Session read access"
  ON public.sessions FOR SELECT
  USING (
    auth.uid() = student_id
    OR auth.uid() = tutor_id
    OR EXISTS (SELECT 1 FROM public.students s WHERE s.id = sessions.student_id AND s.parent_id = auth.uid())
    OR (SELECT role FROM public.users WHERE id = auth.uid()) = 'admin'
  );


-- 5. Let a linked parent read their child's skill map (dashboard + Progress
-- page). NOTE: skill_map's other policies (student's own view, tutor,
-- admin) aren't in any .sql file in this repo, so they were set up
-- directly in the dashboard at some point. This only ADDS a parent policy
-- alongside whatever already exists — but please confirm RLS is actually
-- enabled on skill_map in the dashboard; if it isn't, this policy has no
-- effect (the table would already be fully open to everyone regardless).
DROP POLICY IF EXISTS "parent_view_child_skill_map" ON public.skill_map;
CREATE POLICY "parent_view_child_skill_map"
  ON public.skill_map FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.students s WHERE s.id = skill_map.student_id AND s.parent_id = auth.uid())
  );

-- Messages need no new policy: "Message read access"/"Message insert
-- access" in supabase-setup.sql are already generic sender_id/receiver_id
-- checks with no role restriction, so a linked parent messaging
-- students.tutor_id already works once parent_id is set.
