-- ============================================================
-- POLARIS — Homework submission fixes
-- Run in the Supabase SQL editor.
--
-- Fixes three things:
--
-- 1. There was NO RLS policy letting a student UPDATE their own
--    homework row at all (add-homework-table.sql only ever granted
--    students SELECT). submitStudentHomework()'s UPDATE was being
--    silently blocked by RLS — no error surfaced to the app, so the
--    UI reported "Homework submitted!" even though nothing saved.
--    This is why the photo (and the note) never actually attached.
--
-- 2. The homework-photos bucket's storage policies (also in
--    add-homework-table.sql) only ever allowed the TUTOR to upload
--    (auth.uid() = first path segment). Students upload to
--    'student-submissions/{student_id}/...', so even with #1 fixed,
--    the photo upload itself would still be rejected by storage RLS.
--
-- 3. Enforces one-submission-per-assignment (there's already only
--    one homework row per assignment — a submission is always an
--    UPDATE of it, never a second row) plus a real deadline lock:
--    a student can update/withdraw their own submission only while
--    due_date hasn't passed. This is enforced here at the database
--    level, not just by hiding buttons in the UI.
-- ============================================================

-- 1. Let a student update (submit/edit/withdraw) their own homework row,
--    but only while the assignment isn't past its deadline. Tutors keep
--    their separate full-access policy (tutor_all_homework) unaffected —
--    RLS policies are OR'd, so a tutor update still works regardless of
--    due_date.
DROP POLICY IF EXISTS "student_submit_homework" ON public.homework;
CREATE POLICY "student_submit_homework" ON public.homework
  FOR UPDATE
  USING (auth.uid() = student_id)
  WITH CHECK (
    auth.uid() = student_id
    AND due_date >= CURRENT_DATE
  );

-- 2. Track when a submission was made, and keep it consistent with status.
ALTER TABLE public.homework ADD COLUMN IF NOT EXISTS submitted_at timestamptz;

-- Backfill so the CHECK constraint below doesn't fail on existing rows.
UPDATE public.homework
  SET submitted_at = created_at
  WHERE status IN ('submitted', 'reviewed') AND submitted_at IS NULL;

ALTER TABLE public.homework DROP CONSTRAINT IF EXISTS homework_submission_consistency;
ALTER TABLE public.homework ADD CONSTRAINT homework_submission_consistency
  CHECK (
    (status = 'pending' AND submitted_at IS NULL)
    OR (status IN ('submitted', 'reviewed') AND submitted_at IS NOT NULL)
  );

-- 3. Storage: allow a student to upload into their own submission folder
--    (student-submissions/{student_id}/...) — previously only the tutor
--    upload policy existed, so students could never upload at all.
DROP POLICY IF EXISTS "student_upload_hw_photos" ON storage.objects;
CREATE POLICY "student_upload_hw_photos" ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'homework-photos'
    AND (storage.foldername(name))[1] = 'student-submissions'
    AND auth.uid()::text = (storage.foldername(name))[2]
  );

-- Let a student replace their own submission photo when editing (the app
-- doesn't currently delete the old file on edit/withdraw, but this policy
-- allows it if you want to add cleanup later).
DROP POLICY IF EXISTS "student_delete_hw_photos" ON storage.objects;
CREATE POLICY "student_delete_hw_photos" ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'homework-photos'
    AND (storage.foldername(name))[1] = 'student-submissions'
    AND auth.uid()::text = (storage.foldername(name))[2]
  );

-- ============================================================
-- Also verify in the Supabase Dashboard:
--   Storage > homework-photos bucket exists.
--   The app now stores the STORAGE PATH (not a public URL) in
--   homework.photo_url / homework.student_photo_url, and generates a
--   signed URL for display at read time — this works whether the
--   bucket is public or private, so no bucket setting change is
--   required. If the bucket doesn't exist yet, create it (Public
--   setting doesn't matter for this to work, but private is safer
--   since it's homework photos of K-12 students).
-- ============================================================
