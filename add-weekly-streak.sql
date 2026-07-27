-- ============================================================
-- NUKHBA — Weekly (not per-session/per-day) attendance streak
-- Run in the Supabase SQL editor.
-- ============================================================
--
-- students.attendance_streak is read as-is everywhere in app.js
-- (student dashboard, progress page, parent view) — there is no
-- client-side calculation, so it must be kept correct by a DB
-- trigger. If a trigger already exists that increments the streak
-- per completed session (or per day), first find and drop it:
--
--   select tgname, tgrelid::regclass from pg_trigger
--     where tgrelid = 'public.sessions'::regclass and not tgisinternal;
--
-- Drop whatever you find there (DROP TRIGGER <name> ON public.sessions;)
-- before running this file, so the two don't fight over the same
-- column.
--
-- Rule implemented below: a week (Monday–Sunday) counts toward the
-- streak if the student has at least one 'completed' session in it,
-- no matter how many. The streak is the number of consecutive such
-- weeks counting back from the most recent one attended, and it only
-- breaks once a full elapsed week has passed with zero attendance —
-- the current, still-in-progress week never breaks it.

CREATE OR REPLACE FUNCTION public.recalc_attendance_streak(p_student_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  cur_week  date := date_trunc('week', now())::date;
  last_week date := cur_week - 7;
  max_wk    date;
  walk_wk   date;
  cnt       int := 0;
BEGIN
  SELECT max(wk) INTO max_wk FROM (
    SELECT DISTINCT date_trunc('week', scheduled_at)::date AS wk
    FROM public.sessions
    WHERE student_id = p_student_id AND status = 'completed'
  ) weeks;

  IF max_wk IS NULL OR (max_wk <> cur_week AND max_wk <> last_week) THEN
    -- No attendance ever, or the most recent attended week is more
    -- than one full elapsed week behind now — streak is broken.
    cnt := 0;
  ELSE
    walk_wk := max_wk;
    LOOP
      EXIT WHEN NOT EXISTS (
        SELECT 1 FROM public.sessions
        WHERE student_id = p_student_id
          AND status = 'completed'
          AND date_trunc('week', scheduled_at)::date = walk_wk
      );
      cnt := cnt + 1;
      walk_wk := walk_wk - 7;
    END LOOP;
  END IF;

  UPDATE public.students SET attendance_streak = cnt WHERE id = p_student_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.trg_recalc_attendance_streak()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.status = 'completed' THEN
      PERFORM public.recalc_attendance_streak(NEW.student_id);
    END IF;
  ELSIF TG_OP = 'UPDATE' AND NEW.status IS DISTINCT FROM OLD.status THEN
    IF NEW.status = 'completed' OR OLD.status = 'completed' THEN
      PERFORM public.recalc_attendance_streak(NEW.student_id);
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_session_status_change_streak ON public.sessions;
CREATE TRIGGER on_session_status_change_streak
  AFTER INSERT OR UPDATE OF status ON public.sessions
  FOR EACH ROW EXECUTE FUNCTION public.trg_recalc_attendance_streak();

-- One-time backfill so existing (possibly inflated) values are
-- corrected immediately, not just on the next session change.
DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT id FROM public.students LOOP
    PERFORM public.recalc_attendance_streak(r.id);
  END LOOP;
END $$;

-- ── VERIFICATION ─────────────────────────────────────────────
-- 1. select id, attendance_streak from students; — values should now
--    reflect distinct attended weeks, not session/day counts.
-- 2. Mark two sessions 'completed' for the same student in the same
--    week (via markSessionComplete / the app) — attendance_streak
--    should NOT increase a second time for the second session.
-- 3. Mark a session 'completed' in a new week that follows the
--    previous streak week with no gap — streak should increment by 1.
-- 4. Confirm student dashboard, progress page, and the parent view
--    all show the same number (they already read the same column).
