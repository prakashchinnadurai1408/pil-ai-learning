-- 1. Extend assessments with source mode, JD, schedule window, and question mix
ALTER TABLE public.assessments
  ADD COLUMN IF NOT EXISTS source_mode text NOT NULL DEFAULT 'topic',
  ADD COLUMN IF NOT EXISTS topic_or_skills text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS jd_text text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS jd_file_url text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS start_at timestamptz NULL,
  ADD COLUMN IF NOT EXISTS end_at timestamptz NULL,
  ADD COLUMN IF NOT EXISTS question_mix jsonb NOT NULL DEFAULT '{"mcq":0,"descriptive":0,"video":0,"coding":0}'::jsonb;

-- 2. Extend assessment_questions for typed questions
ALTER TABLE public.assessment_questions
  ADD COLUMN IF NOT EXISTS question_type text NOT NULL DEFAULT 'mcq',
  ADD COLUMN IF NOT EXISTS expected_answer text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS max_score integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS time_limit_seconds integer NULL,
  ADD COLUMN IF NOT EXISTS starter_code text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS language text NOT NULL DEFAULT '';

-- Allow options/correct to be null for non-MCQ types
ALTER TABLE public.assessment_questions
  ALTER COLUMN correct DROP NOT NULL;

-- 3. Extend attempts with per-question responses + AI grading payload
ALTER TABLE public.assessment_attempts
  ADD COLUMN IF NOT EXISTS responses jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS ai_grading jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS grading_status text NOT NULL DEFAULT 'pending';

-- 4. Question bank gets type + expected answer for re-use across types
ALTER TABLE public.quiz_question_bank
  ADD COLUMN IF NOT EXISTS question_type text NOT NULL DEFAULT 'mcq',
  ADD COLUMN IF NOT EXISTS expected_answer text NOT NULL DEFAULT '';

-- 5. Storage bucket for JD uploads + student video answers
INSERT INTO storage.buckets (id, name, public)
VALUES ('assessment-uploads', 'assessment-uploads', true)
ON CONFLICT (id) DO NOTHING;

-- Public read + open insert/update (matches existing project pattern with public buckets)
DO $$ BEGIN
  CREATE POLICY "Assessment uploads public read"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'assessment-uploads');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Assessment uploads public insert"
    ON storage.objects FOR INSERT
    WITH CHECK (bucket_id = 'assessment-uploads');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Assessment uploads public update"
    ON storage.objects FOR UPDATE
    USING (bucket_id = 'assessment-uploads');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Assessment uploads public delete"
    ON storage.objects FOR DELETE
    USING (bucket_id = 'assessment-uploads');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;