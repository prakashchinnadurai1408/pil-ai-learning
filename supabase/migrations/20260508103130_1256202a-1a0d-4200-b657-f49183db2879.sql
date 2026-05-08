
-- Assignment workflow: due dates and status
ALTER TABLE public.curriculum_assignments
  ADD COLUMN IF NOT EXISTS due_date date,
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS notes text NOT NULL DEFAULT '';

-- Per-subtopic quizzes (curriculum_quizzes was per-topic only)
ALTER TABLE public.curriculum_quizzes
  ADD COLUMN IF NOT EXISTS subtopic_id uuid,
  ADD COLUMN IF NOT EXISTS difficulty text NOT NULL DEFAULT 'medium',
  ADD COLUMN IF NOT EXISTS scope text NOT NULL DEFAULT 'topic';

-- Version history snapshots for trainer curricula
CREATE TABLE IF NOT EXISTS public.curriculum_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  curriculum_id uuid NOT NULL,
  version_number integer NOT NULL,
  label text NOT NULL DEFAULT '',
  snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by text NOT NULL DEFAULT '',
  created_by_name text NOT NULL DEFAULT '',
  is_published boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_curriculum_versions_curr ON public.curriculum_versions(curriculum_id, version_number DESC);

ALTER TABLE public.curriculum_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read curriculum_versions" ON public.curriculum_versions FOR SELECT USING (true);
CREATE POLICY "Anyone can insert curriculum_versions" ON public.curriculum_versions FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update curriculum_versions" ON public.curriculum_versions FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Anyone can delete curriculum_versions" ON public.curriculum_versions FOR DELETE USING (true);
