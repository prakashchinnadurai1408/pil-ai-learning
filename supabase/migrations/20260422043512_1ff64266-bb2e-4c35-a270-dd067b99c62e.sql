-- Trainer approval activity log
CREATE TABLE public.trainer_activity_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trainer_id uuid NOT NULL,
  trainer_name text NOT NULL DEFAULT '',
  action text NOT NULL,
  reason text NOT NULL DEFAULT '',
  actor_id text NOT NULL DEFAULT 'admin',
  actor_name text NOT NULL DEFAULT 'Admin',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.trainer_activity_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read trainer activity" ON public.trainer_activity_log FOR SELECT USING (true);
CREATE POLICY "Anyone can insert trainer activity" ON public.trainer_activity_log FOR INSERT WITH CHECK (true);
CREATE INDEX idx_trainer_activity_trainer ON public.trainer_activity_log(trainer_id, created_at DESC);

-- Versioning for video lessons
ALTER TABLE public.video_lessons
  ADD COLUMN IF NOT EXISTS version integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS last_regenerated_at timestamptz;

CREATE TABLE public.video_lesson_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id uuid NOT NULL REFERENCES public.video_lessons(id) ON DELETE CASCADE,
  version integer NOT NULL,
  chapters jsonb NOT NULL DEFAULT '[]'::jsonb,
  questions jsonb NOT NULL DEFAULT '[]'::jsonb,
  generated_at timestamptz NOT NULL DEFAULT now(),
  generated_by text NOT NULL DEFAULT 'admin',
  note text NOT NULL DEFAULT ''
);
ALTER TABLE public.video_lesson_versions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read lesson versions" ON public.video_lesson_versions FOR SELECT USING (true);
CREATE POLICY "Anyone can insert lesson versions" ON public.video_lesson_versions FOR INSERT WITH CHECK (true);
CREATE INDEX idx_lesson_versions_lesson ON public.video_lesson_versions(lesson_id, version DESC);