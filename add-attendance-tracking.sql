ALTER TABLE public.sessions ADD COLUMN IF NOT EXISTS student_joined boolean DEFAULT false;
ALTER TABLE public.sessions ADD COLUMN IF NOT EXISTS student_joined_at timestamptz;
