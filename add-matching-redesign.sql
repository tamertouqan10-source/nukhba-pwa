-- ============================================================
-- NUKHBA — Matching redesign schema update
-- Run AFTER add-match-features.sql and add-tender-matching.sql
-- ============================================================

-- Students: new mirrored quiz fields
ALTER TABLE public.students
  ADD COLUMN IF NOT EXISTS subjects        text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS learning_method text,
  ADD COLUMN IF NOT EXISTS preferred_style text;

-- Tutors: new mirrored quiz fields
ALTER TABLE public.tutors
  ADD COLUMN IF NOT EXISTS teaching_method text,
  ADD COLUMN IF NOT EXISTS tutor_style     text;

-- NOTE: Existing students will have learning_method = NULL.
-- The app detects this and forces them through the new quiz on next login.
-- Existing tutors will have teaching_method = NULL and will also be re-quizzed.
