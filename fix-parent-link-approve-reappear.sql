-- ============================================================
-- POLARIS — Fix "approved parent-link requests keep reappearing"
-- Run in the Supabase SQL editor.
--
-- YOU MUST RUN THIS FILE IN SUPABASE. Do not assume
-- add-parent-link-requests.sql was already applied — this file is
-- idempotent (DROP-then-CREATE / IF NOT EXISTS / dedupe-then-constrain)
-- and safe to run whether or not the earlier files were run.
--
-- ROOT CAUSE: if the admin-only UPDATE policies below were never
-- actually created (e.g. add-parent-link-requests.sql was never run),
-- then clicking "Approve" issues an UPDATE that RLS silently blocks —
-- Postgres/PostgREST does not raise an error for an UPDATE that
-- matches zero rows under RLS, it just no-ops. The app showed a
-- false "success" toast and removed the card from the screen, but
-- parent_link_requests.status was never actually changed to
-- 'approved', so the request comes right back as 'pending' on the
-- next refresh. (The app-side fix — checking that the UPDATE actually
-- returned a row via .select() — has been made in supabase.js
-- alongside this file; this file makes sure the policy exists so
-- that check actually passes for a real admin.)
-- ============================================================

-- 1. Dedupe: if a parent somehow ended up with more than one row for
--    the same student (possible before a UNIQUE constraint existed),
--    keep one row per (parent_id, student_id) and delete the rest.
--    Prefer an already-resolved row (approved/rejected) over a 'pending'
--    one, then the most recent — otherwise a stray newer 'pending'
--    duplicate could win over an older 'approved' row and resurrect an
--    already-handled request, the exact symptom this migration fixes.
DELETE FROM public.parent_link_requests
WHERE id IN (
  SELECT id FROM (
    SELECT id, ROW_NUMBER() OVER (
      PARTITION BY parent_id, student_id
      ORDER BY (status <> 'pending') DESC, created_at DESC, id DESC
    ) AS rn
    FROM public.parent_link_requests
  ) ranked
  WHERE ranked.rn > 1
);

-- 2. Guarantee a UNIQUE(parent_id, student_id) constraint exists, so a
--    parent can never again end up with two rows for the same student —
--    submitParentLinkRequest() already upserts on this exact conflict
--    target, so once this constraint is in place a duplicate submit
--    flips the existing row back to 'pending' instead of inserting a
--    new one.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'parent_link_requests_parent_id_student_id_key'
  ) THEN
    ALTER TABLE public.parent_link_requests
      ADD CONSTRAINT parent_link_requests_parent_id_student_id_key UNIQUE (parent_id, student_id);
  END IF;
END $$;

-- 3. Re-assert the admin-only UPDATE policies that make Approve/Reject
--    (and the students.parent_id write that approval performs) actually
--    take effect. Safe to re-run even if add-parent-link-requests.sql
--    already created these — DROP IF EXISTS then CREATE is a no-op change.
DROP POLICY IF EXISTS "admin_update_link_requests" ON public.parent_link_requests;
CREATE POLICY "admin_update_link_requests"
  ON public.parent_link_requests FOR UPDATE
  USING ((SELECT role FROM public.users WHERE id = auth.uid()) = 'admin')
  WITH CHECK ((SELECT role FROM public.users WHERE id = auth.uid()) = 'admin');

DROP POLICY IF EXISTS "admin_update_students" ON public.students;
CREATE POLICY "admin_update_students"
  ON public.students FOR UPDATE
  USING ((SELECT role FROM public.users WHERE id = auth.uid()) = 'admin')
  WITH CHECK ((SELECT role FROM public.users WHERE id = auth.uid()) = 'admin');
