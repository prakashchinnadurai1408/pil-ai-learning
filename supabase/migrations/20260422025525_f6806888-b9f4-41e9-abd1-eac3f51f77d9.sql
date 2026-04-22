-- 1) Trainer approval workflow
ALTER TABLE public.trainers
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS approved_at timestamptz,
  ADD COLUMN IF NOT EXISTS approved_by text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS rejection_reason text NOT NULL DEFAULT '';

-- Backfill existing trainers as approved so they aren't locked out
UPDATE public.trainers SET status = 'approved', approved_at = now(), approved_by = 'system'
WHERE status = 'pending' AND created_at < now() - interval '1 minute';

-- 2) Video lessons + auto-generated chapter MCQs
CREATE TABLE IF NOT EXISTS public.video_lessons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  youtube_url text NOT NULL,
  youtube_video_id text NOT NULL DEFAULT '',
  thumbnail_url text NOT NULL DEFAULT '',
  duration_seconds integer NOT NULL DEFAULT 0,
  module_id integer,
  status text NOT NULL DEFAULT 'draft',
  generation_status text NOT NULL DEFAULT 'idle', -- idle | running | success | failed
  generation_error text NOT NULL DEFAULT '',
  chapters jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_by text NOT NULL DEFAULT 'admin',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.video_lessons ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read video lessons" ON public.video_lessons FOR SELECT USING (true);
CREATE POLICY "Anyone can insert video lessons" ON public.video_lessons FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update video lessons" ON public.video_lessons FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Anyone can delete video lessons" ON public.video_lessons FOR DELETE USING (true);

CREATE TABLE IF NOT EXISTS public.video_lesson_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id uuid NOT NULL REFERENCES public.video_lessons(id) ON DELETE CASCADE,
  chapter_index integer NOT NULL DEFAULT 0,
  chapter_title text NOT NULL DEFAULT '',
  chapter_start_seconds integer NOT NULL DEFAULT 0,
  question text NOT NULL,
  options jsonb NOT NULL DEFAULT '[]'::jsonb,
  correct integer NOT NULL DEFAULT 0,
  explanation text NOT NULL DEFAULT '',
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.video_lesson_questions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read video lesson questions" ON public.video_lesson_questions FOR SELECT USING (true);
CREATE POLICY "Anyone can insert video lesson questions" ON public.video_lesson_questions FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update video lesson questions" ON public.video_lesson_questions FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Anyone can delete video lesson questions" ON public.video_lesson_questions FOR DELETE USING (true);

CREATE INDEX IF NOT EXISTS idx_video_lesson_questions_lesson ON public.video_lesson_questions(lesson_id, chapter_index, sort_order);

-- 3) Login + OTP attempt log (used by the Admin export)
CREATE TABLE IF NOT EXISTS public.login_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  audience text NOT NULL DEFAULT 'student', -- student | trainer | admin
  identifier text NOT NULL DEFAULT '',       -- email or mobile
  identifier_type text NOT NULL DEFAULT 'mobile',
  user_id uuid,
  user_name text NOT NULL DEFAULT '',
  stage text NOT NULL DEFAULT 'password',    -- password | otp_issued | otp_verified | login_success
  status text NOT NULL DEFAULT 'success',    -- success | failure
  reason text NOT NULL DEFAULT '',
  ip_address text NOT NULL DEFAULT '',
  user_agent text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.login_attempts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read login attempts" ON public.login_attempts FOR SELECT USING (true);
CREATE POLICY "Anyone can insert login attempts" ON public.login_attempts FOR INSERT WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_login_attempts_created ON public.login_attempts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_login_attempts_audience ON public.login_attempts(audience, created_at DESC);

-- updated_at triggers
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;

DROP TRIGGER IF EXISTS trg_video_lessons_updated ON public.video_lessons;
CREATE TRIGGER trg_video_lessons_updated BEFORE UPDATE ON public.video_lessons
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();