-- ============================================================
-- NUKHBA — Fix tutors + students schema column mismatches
-- Root cause: onboardingSubmit writes new column names that
-- don't exist yet, causing silent upsert failures.
-- Run this in the Supabase SQL editor (service role).
-- ============================================================

-- ── tutors: add all columns the code expects ──────────────
alter table public.tutors add column if not exists teaching_method       text;
alter table public.tutors add column if not exists tutor_style            text;
alter table public.tutors add column if not exists bio                    text;
alter table public.tutors add column if not exists teacher_reference      text;
alter table public.tutors add column if not exists accepting_new_students boolean default true;
alter table public.tutors add column if not exists subjects               text[] default '{}';

-- Migrate any legacy data from old column names so existing rows survive
update public.tutors
  set teaching_method = teaching_style
  where teaching_method is null and teaching_style is not null;

update public.tutors
  set tutor_style = personality
  where tutor_style is null and personality is not null;

-- ── students: add all columns the code expects ────────────
alter table public.students add column if not exists subjects         text[] default '{}';
alter table public.students add column if not exists learning_method  text;
alter table public.students add column if not exists preferred_style  text;
alter table public.students add column if not exists pace_preference  text;
alter table public.students add column if not exists grade            integer;
alter table public.students add column if not exists goal_description text;

-- ── verify (run separately and read the output) ───────────
-- select column_name, data_type from information_schema.columns
--   where table_name = 'tutors' order by ordinal_position;
-- select column_name, data_type from information_schema.columns
--   where table_name = 'students' order by ordinal_position;

-- ── AFTER RUNNING THIS ────────────────────────────────────
-- The existing test tutor must log in again and complete the
-- onboarding quiz so a tutors row is created with the new columns.
-- Verify with:
--   select id, subjects, teaching_method, tutor_style from tutors;
