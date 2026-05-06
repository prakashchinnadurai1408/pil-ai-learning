CREATE TABLE IF NOT EXISTS public.video_quiz_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id uuid NOT NULL,
  student_id uuid NOT NULL,
  answers jsonb NOT NULL DEFAULT '{}'::jsonb,
  remaining_seconds integer,
  started_at_ms bigint,
  submitted boolean NOT NULL DEFAULT false,
  score integer NOT NULL DEFAULT 0,
  last_question_id text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(lesson_id, student_id)
);
ALTER TABLE public.video_quiz_progress ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read video quiz progress" ON public.video_quiz_progress FOR SELECT USING (true);
CREATE POLICY "Anyone can insert video quiz progress" ON public.video_quiz_progress FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update video quiz progress" ON public.video_quiz_progress FOR UPDATE USING (true);
CREATE INDEX IF NOT EXISTS idx_video_quiz_progress_student ON public.video_quiz_progress(student_id);
CREATE TRIGGER set_video_quiz_progress_updated_at BEFORE UPDATE ON public.video_quiz_progress FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();