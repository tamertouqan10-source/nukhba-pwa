-- ============================================================
-- POLARIS — Fix tutor visibility + match RLS
-- Run AFTER all prior migrations (add-match-features.sql,
-- add-tender-matching.sql, add-matching-redesign.sql)
-- ============================================================

-- ── STEP 1 DIAGNOSTICS (run these first, read the output) ──
-- Paste and run each block separately in the SQL editor.

-- 1a. Confirm the tutor row exists with required fields:
-- select id, subjects, teaching_method, accepting_new_students from tutors;
-- Expected: at least one row; subjects not empty; teaching_method not null.
-- If teaching_method IS null → tutor must complete the new onboarding quiz.

-- 1b. List all current policies on relevant tables:
-- select tablename, policyname, cmd, qual
-- from pg_policies
-- where tablename in ('tutors','users','students','match_scores','match_requests')
-- order by tablename, cmd;
-- Read this output before running the fixes below so you know what already exists.

-- ── STEP 2 FIXES ────────────────────────────────────────────

-- ── tutors: let any authenticated user read all tutor profiles ──
-- (required for student matching — without this loadStudentMatchesComputed
--  returns zero rows silently because RLS blocks the SELECT)
drop policy if exists "tutors_select_own"                      on public.tutors;
drop policy if exists "Tutors can view own profile"            on public.tutors;
drop policy if exists "tutors_readable_by_authenticated"       on public.tutors;

create policy "tutors_readable_by_authenticated"
  on public.tutors
  for select
  to authenticated
  using (true);

-- ── users: let any authenticated user read display names ──
-- (needed for the users(full_name) join inside loadStudentMatchesComputed
--  and all message/request pages that show names)
-- NOTE: this exposes id, full_name, role, email, is_approved to all
-- logged-in users. Those columns are non-sensitive for this platform.
-- If you add sensitive columns later, replace with a restricted view.
drop policy if exists "users_names_readable_by_authenticated"  on public.users;
drop policy if exists "Users can view own profile"             on public.users;
drop policy if exists "Users read own row"                     on public.users;

create policy "users_names_readable_by_authenticated"
  on public.users
  for select
  to authenticated
  using (true);

-- ── students: tutor can update tutor_id when a request was accepted ──
-- (respondToMatchRequest runs from the TUTOR session — without this the
--  UPDATE to students.tutor_id silently fails even if match_requests succeeds)
drop policy if exists "students_tutor_id_by_requested_tutor"  on public.students;

create policy "students_tutor_id_by_requested_tutor"
  on public.students
  for update
  to authenticated
  using (
    -- student can update their own row (existing behaviour)
    auth.uid() = id
    or
    -- tutor can update a student's row only if a match_request exists
    exists (
      select 1 from public.match_requests mr
      where mr.student_id = public.students.id
        and mr.tutor_id   = auth.uid()
    )
  );

-- ── match_requests: clean up and recreate ──
-- The add-tender-matching.sql policies use broad FOR ALL which can conflict.
-- Drop all and recreate with explicit per-command policies.
drop policy if exists "Students manage own requests"           on public.match_requests;
drop policy if exists "Tutors view own requests"               on public.match_requests;
drop policy if exists "Tutors update own requests"             on public.match_requests;
drop policy if exists "Admins view all requests"               on public.match_requests;
drop policy if exists "match_requests_all"                     on public.match_requests;
drop policy if exists "match_requests_student_insert"          on public.match_requests;
drop policy if exists "match_requests_read_own"                on public.match_requests;
drop policy if exists "match_requests_student_upsert_update"   on public.match_requests;

-- Students can insert (send) their own requests
create policy "match_requests_student_insert"
  on public.match_requests
  for insert
  to authenticated
  with check (auth.uid() = student_id);

-- Both parties can read requests they're involved in
create policy "match_requests_read_own"
  on public.match_requests
  for select
  to authenticated
  using (auth.uid() = student_id or auth.uid() = tutor_id);

-- Student can re-upsert (update status back to pending if re-requesting);
-- tutor can update status to accepted/declined
create policy "match_requests_update_parties"
  on public.match_requests
  for update
  to authenticated
  using  (auth.uid() = student_id or auth.uid() = tutor_id)
  with check (auth.uid() = student_id or auth.uid() = tutor_id);

-- Admins can read everything
create policy "match_requests_admin_select"
  on public.match_requests
  for select
  to authenticated
  using (
    exists (
      select 1 from public.users
      where id = auth.uid() and role = 'admin'
    )
  );

-- ── match_scores: student can upsert/read their own scores ──
-- (runMatchEngine writes to this table from the student session)
drop policy if exists "match_scores_student_rw"                on public.match_scores;

create policy "match_scores_student_rw"
  on public.match_scores
  for all
  to authenticated
  using  (auth.uid() = student_id)
  with check (auth.uid() = student_id);

-- ── STEP 3 VERIFICATION CHECKLIST ───────────────────────────
-- After running the above:
-- 1. Log in as a student → Find tutors page → tutor card with name +
--    subjects + compatibility % should appear.
-- 2. Click "Send request" → row should appear in match_requests table
--    (check in Supabase table editor; status = 'pending').
-- 3. Log in as the tutor → Requests tab → should see the student's request.
-- 4. Click "Accept" → check students table: that student's tutor_id column
--    should now equal the tutor's id.
-- 5. Log back in as the student → other portal tabs (Dashboard, Sessions,
--    etc.) should now be unlocked (gate cleared because tutor_id is set).
