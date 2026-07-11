-- ============================================================
-- NUKHBA — Unique constraint for match_scores upsert
-- Run AFTER fix-tutor-visibility.sql
-- ============================================================

-- runMatchEngine() in app.js does:
--   supabase.from('match_scores').upsert(scores, { onConflict: 'student_id,tutor_id' })
-- PostgREST requires a UNIQUE or EXCLUSION constraint matching the
-- onConflict target columns, or it rejects the upsert with a 400
-- ("there is no unique or exclusion constraint matching the ON CONFLICT
-- specification"). Add it if missing (safe to re-run).
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'match_scores_student_tutor_unique'
  ) then
    alter table public.match_scores
      add constraint match_scores_student_tutor_unique unique (student_id, tutor_id);
  end if;
end $$;

-- ── VERIFICATION ─────────────────────────────────────────────
-- 1. select conname from pg_constraint where conname =
--    'match_scores_student_tutor_unique';  -- should return one row
-- 2. Log in as a student → Find tutors page → console should show no
--    "[Match] Upsert error" from app.js (background match_scores upsert).
