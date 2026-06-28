-- =============================================================
-- NUKHBA — Supabase RLS + Trigger Setup
-- Run this in the Supabase SQL Editor (Dashboard → SQL Editor)
-- =============================================================

-- ----------------------------------------------------------------
-- 1. TRIGGER: auto-create users row on auth.users INSERT
--
-- WHY: When email confirmation is required, signUp() returns a
-- user object but no session, so auth.uid() is NULL at insert time.
-- The direct INSERT from the client therefore fails every RLS policy
-- that checks auth.uid() = id.
--
-- This trigger runs SECURITY DEFINER (bypasses RLS) and reads
-- full_name / role from raw_user_meta_data, which the client now
-- passes via options.data in the signUp() call.
-- ----------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name, role, is_approved)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'role', 'student'),
    false
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- ----------------------------------------------------------------
-- 2. RLS POLICIES for the users table
-- ----------------------------------------------------------------

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Drop any existing policies before re-creating them.
DROP POLICY IF EXISTS "Users can view own profile"        ON public.users;
DROP POLICY IF EXISTS "Admins can view all profiles"      ON public.users;
DROP POLICY IF EXISTS "Allow insert during signup"        ON public.users;
DROP POLICY IF EXISTS "Users can update own profile"      ON public.users;
DROP POLICY IF EXISTS "Admins can update any profile"     ON public.users;
DROP POLICY IF EXISTS "Admins can delete any profile"     ON public.users;

-- SELECT: each user sees only their own row; admins see all.
CREATE POLICY "Users can view own profile"
  ON public.users FOR SELECT
  USING (
    auth.uid() = id
    OR (SELECT role FROM public.users WHERE id = auth.uid()) = 'admin'
  );

-- INSERT: allow authenticated users to insert their own row.
-- The trigger above is the primary path; this policy is a fallback
-- for environments where email confirmation is disabled (session is
-- established immediately and auth.uid() is available).
CREATE POLICY "Allow insert during signup"
  ON public.users FOR INSERT
  TO authenticated, anon
  WITH CHECK (
    auth.uid() = id
    OR (auth.jwt() ->> 'sub')::uuid = id
  );

-- UPDATE: users update their own row; admins update any row.
CREATE POLICY "Users can update own profile"
  ON public.users FOR UPDATE
  USING (
    auth.uid() = id
    OR (SELECT role FROM public.users WHERE id = auth.uid()) = 'admin'
  )
  WITH CHECK (
    auth.uid() = id
    OR (SELECT role FROM public.users WHERE id = auth.uid()) = 'admin'
  );

-- DELETE: only admins may delete rows.
CREATE POLICY "Admins can delete any profile"
  ON public.users FOR DELETE
  USING (
    (SELECT role FROM public.users WHERE id = auth.uid()) = 'admin'
  );


-- ----------------------------------------------------------------
-- 3. RLS POLICIES for students, tutors, sessions, etc.
--    (Add / adjust these to match your schema.)
-- ----------------------------------------------------------------

-- students: student sees own row; their tutor and admins see it too.
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Student row access" ON public.students;
CREATE POLICY "Student row access"
  ON public.students FOR SELECT
  USING (
    auth.uid() = id
    OR auth.uid() = tutor_id
    OR auth.uid() = parent_id
    OR (SELECT role FROM public.users WHERE id = auth.uid()) = 'admin'
  );

-- tutors: tutor sees own row; admins see all.
ALTER TABLE public.tutors ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Tutor row access" ON public.tutors;
CREATE POLICY "Tutor row access"
  ON public.tutors FOR SELECT
  USING (
    auth.uid() = id
    OR (SELECT role FROM public.users WHERE id = auth.uid()) = 'admin'
  );

-- sessions: student, tutor, or admin may read.
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Session read access" ON public.sessions;
CREATE POLICY "Session read access"
  ON public.sessions FOR SELECT
  USING (
    auth.uid() = student_id
    OR auth.uid() = tutor_id
    OR (SELECT role FROM public.users WHERE id = auth.uid()) = 'admin'
  );

-- messages: sender or receiver may read; only sender may insert.
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Message read access"   ON public.messages;
DROP POLICY IF EXISTS "Message insert access" ON public.messages;
CREATE POLICY "Message read access"
  ON public.messages FOR SELECT
  USING (auth.uid() = sender_id OR auth.uid() = receiver_id);
CREATE POLICY "Message insert access"
  ON public.messages FOR INSERT
  WITH CHECK (auth.uid() = sender_id);

-- points_transactions: student sees own; admin sees all; only admin inserts.
ALTER TABLE public.points_transactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Points read access"   ON public.points_transactions;
DROP POLICY IF EXISTS "Points insert access" ON public.points_transactions;
CREATE POLICY "Points read access"
  ON public.points_transactions FOR SELECT
  USING (
    auth.uid() = student_id
    OR (SELECT role FROM public.users WHERE id = auth.uid()) = 'admin'
  );
CREATE POLICY "Points insert access"
  ON public.points_transactions FOR INSERT
  WITH CHECK (
    (SELECT role FROM public.users WHERE id = auth.uid()) IN ('admin', 'tutor')
  );

-- reward_requests: student, tutor, or admin may read; student inserts own.
ALTER TABLE public.reward_requests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Reward request read access"   ON public.reward_requests;
DROP POLICY IF EXISTS "Reward request insert access" ON public.reward_requests;
CREATE POLICY "Reward request read access"
  ON public.reward_requests FOR SELECT
  USING (
    auth.uid() = student_id
    OR (SELECT role FROM public.users WHERE id = auth.uid()) IN ('admin', 'tutor')
  );
CREATE POLICY "Reward request insert access"
  ON public.reward_requests FOR INSERT
  WITH CHECK (auth.uid() = student_id);
