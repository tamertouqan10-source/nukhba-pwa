-- ============================================================
-- NUKHBA — Match features schema update
-- Run in the Supabase SQL editor.
-- ============================================================

-- 1. Allow tutors to opt out of new student matching
ALTER TABLE public.tutors
  ADD COLUMN IF NOT EXISTS accepting_new_students boolean NOT NULL DEFAULT true;

-- Match engine should skip tutors where accepting_new_students = false
-- (update your runMatchEngine query to add .eq('accepting_new_students', true)
--  on the tutors select if you want hard filtering)

-- 2. Student homework submission fields
ALTER TABLE public.homework
  ADD COLUMN IF NOT EXISTS student_note      text,
  ADD COLUMN IF NOT EXISTS student_photo_url text;

-- Update the homework status CHECK constraint to accept 'submitted'
-- (only needed if you have a strict CHECK constraint on status)
-- If the homework table was created without a CHECK on status, skip this.
-- ALTER TABLE public.homework DROP CONSTRAINT IF EXISTS homework_status_check;
-- ALTER TABLE public.homework ADD CONSTRAINT homework_status_check
--   CHECK (status IN ('pending', 'submitted', 'completed', 'assigned'));
