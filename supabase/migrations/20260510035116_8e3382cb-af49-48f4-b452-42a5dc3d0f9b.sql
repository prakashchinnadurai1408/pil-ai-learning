
ALTER TABLE public.curriculum_submissions
  ADD COLUMN IF NOT EXISTS revision_due_date date,
  ADD COLUMN IF NOT EXISTS revision_message text NOT NULL DEFAULT '';

CREATE TABLE IF NOT EXISTS public.curriculum_submission_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id uuid NOT NULL,
  curriculum_id uuid NOT NULL,
  student_id uuid NOT NULL,
  version_number integer NOT NULL DEFAULT 1,
  kind text NOT NULL DEFAULT 'student_submission',
  attachment_url text NOT NULL DEFAULT '',
  attachment_name text NOT NULL DEFAULT '',
  notes text NOT NULL DEFAULT '',
  trainer_feedback text NOT NULL DEFAULT '',
  revision_message text NOT NULL DEFAULT '',
  revision_due_date date,
  score integer,
  max_score integer,
  status text NOT NULL DEFAULT '',
  actor_id text NOT NULL DEFAULT '',
  actor_name text NOT NULL DEFAULT '',
  actor_role text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.curriculum_submission_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read submission history" ON public.curriculum_submission_history FOR SELECT USING (true);
CREATE POLICY "Anyone can insert submission history" ON public.curriculum_submission_history FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can delete submission history" ON public.curriculum_submission_history FOR DELETE USING (true);

CREATE INDEX IF NOT EXISTS idx_curriculum_submission_history_submission ON public.curriculum_submission_history(submission_id, created_at DESC);
