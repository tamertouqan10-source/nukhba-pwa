-- ============================================================
-- NUKHBA — Tender-style matching + tutor profile expansion
-- Run in the Supabase SQL editor after add-match-features.sql
-- ============================================================

-- 1. Teacher reference field on tutors
ALTER TABLE public.tutors
  ADD COLUMN IF NOT EXISTS teacher_reference text;

-- 2. Match requests table (student expresses interest, tutor accepts/declines)
CREATE TABLE IF NOT EXISTS public.match_requests (
  id         uuid        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id uuid        NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  tutor_id   uuid        NOT NULL REFERENCES public.tutors(id)   ON DELETE CASCADE,
  status     text        NOT NULL DEFAULT 'pending'
               CHECK (status IN ('pending', 'accepted', 'declined')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(student_id, tutor_id)
);

-- Index for fast tutor-side lookups
CREATE INDEX IF NOT EXISTS match_requests_tutor_id_idx ON public.match_requests(tutor_id);

-- Row Level Security
ALTER TABLE public.match_requests ENABLE ROW LEVEL SECURITY;

-- Students can see and create their own requests
CREATE POLICY "Students manage own requests"
  ON public.match_requests
  FOR ALL
  USING (auth.uid() = student_id)
  WITH CHECK (auth.uid() = student_id);

-- Tutors can see and update requests directed at them
CREATE POLICY "Tutors view own requests"
  ON public.match_requests
  FOR SELECT
  USING (auth.uid() = tutor_id);

CREATE POLICY "Tutors update own requests"
  ON public.match_requests
  FOR UPDATE
  USING (auth.uid() = tutor_id)
  WITH CHECK (auth.uid() = tutor_id);

-- Admins can see everything (requires admin role in users table)
CREATE POLICY "Admins view all requests"
  ON public.match_requests
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );
