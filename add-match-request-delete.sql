-- ============================================================
-- NUKHBA — Allow students to withdraw a pending match request
-- Run AFTER fix-tutor-visibility.sql
-- ============================================================

-- Students can delete their own request while it's still pending
-- (withdrawMatchRequest in app.js calls DB.cancelMatchRequest, which
--  issues a DELETE .eq('status','pending') — without this policy the
--  delete is silently blocked by RLS and returns 0 rows affected)
drop policy if exists "match_requests_student_delete" on public.match_requests;

create policy "match_requests_student_delete"
  on public.match_requests
  for delete
  to authenticated
  using (auth.uid() = student_id and status = 'pending');

-- ── VERIFICATION ─────────────────────────────────────────────
-- 1. Log in as a student with a pending request → Find tutors page →
--    click "Withdraw" next to the pending request.
-- 2. Row should disappear from match_requests (check Supabase table editor).
-- 3. If it was the student's only request and they have no tutor_id yet,
--    the full-screen matching overlay should reappear with the close
--    button disabled again.
