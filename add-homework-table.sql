-- ============================================================
-- NUKHBA — Homework table + storage bucket setup
-- Run this in the Supabase SQL editor, then configure the
-- storage bucket as described below.
-- ============================================================

-- 1. Homework table
CREATE TABLE IF NOT EXISTS public.homework (
  id          uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id  uuid         NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  tutor_id    uuid         NOT NULL REFERENCES public.tutors(id)   ON DELETE CASCADE,
  title       text         NOT NULL,
  description text,
  photo_url   text,
  due_date    date         NOT NULL,
  status      text         NOT NULL DEFAULT 'pending'
                           CHECK (status IN ('pending','submitted','reviewed')),
  created_at  timestamptz  NOT NULL DEFAULT now()
);

-- 2. RLS on homework table
ALTER TABLE public.homework ENABLE ROW LEVEL SECURITY;

-- Tutor: full access to their own records
CREATE POLICY "tutor_all_homework" ON public.homework
  FOR ALL
  USING  (auth.uid() = tutor_id)
  WITH CHECK (auth.uid() = tutor_id);

-- Student: view their own homework
CREATE POLICY "student_view_homework" ON public.homework
  FOR SELECT
  USING (auth.uid() = student_id);

-- Parent: view their child's homework
CREATE POLICY "parent_view_homework" ON public.homework
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.students
      WHERE students.id        = homework.student_id
        AND students.parent_id = auth.uid()
    )
  );

-- ============================================================
-- 3. Storage bucket (homework-photos)
-- Run in the Supabase SQL editor after creating the bucket
-- via Dashboard > Storage > New bucket:
--   Name: homework-photos
--   Public: false (private, access via RLS below)
-- ============================================================

-- Tutor can upload files into their own folder ({tutor_id}/{student_id}/...)
CREATE POLICY "tutor_upload_hw_photos" ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'homework-photos'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Tutor can view and delete their uploaded files
CREATE POLICY "tutor_select_hw_photos" ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'homework-photos'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "tutor_delete_hw_photos" ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'homework-photos'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Student can view their own homework photos (second path segment = student_id)
CREATE POLICY "student_select_hw_photos" ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'homework-photos'
    AND auth.uid()::text = (storage.foldername(name))[2]
  );

-- Parent can view their child's homework photos
CREATE POLICY "parent_select_hw_photos" ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'homework-photos'
    AND EXISTS (
      SELECT 1 FROM public.students
      WHERE students.id::text        = (storage.foldername(name))[2]
        AND students.parent_id       = auth.uid()
    )
  );
