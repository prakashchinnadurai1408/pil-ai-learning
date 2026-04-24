-- Enable pgvector for RAG embeddings
CREATE EXTENSION IF NOT EXISTS vector;

-- =============================================================
-- 1) RAG study sandbox
-- =============================================================
CREATE TABLE IF NOT EXISTS public.rag_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid,
  student_name text NOT NULL DEFAULT '',
  module_id integer,
  topic text NOT NULL DEFAULT '',
  file_name text NOT NULL,
  file_size integer NOT NULL DEFAULT 0,
  mime_type text NOT NULL DEFAULT '',
  storage_path text NOT NULL DEFAULT '',
  embedding_model text NOT NULL DEFAULT 'google/text-embedding-004',
  chunk_count integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending', -- pending | embedding | ready | failed
  error_message text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.rag_documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read rag documents" ON public.rag_documents FOR SELECT USING (true);
CREATE POLICY "Anyone can insert rag documents" ON public.rag_documents FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update rag documents" ON public.rag_documents FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Anyone can delete rag documents" ON public.rag_documents FOR DELETE USING (true);

CREATE TABLE IF NOT EXISTS public.rag_document_chunks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid NOT NULL REFERENCES public.rag_documents(id) ON DELETE CASCADE,
  chunk_index integer NOT NULL DEFAULT 0,
  page_number integer,
  content text NOT NULL,
  embedding vector(768),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.rag_document_chunks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read rag chunks" ON public.rag_document_chunks FOR SELECT USING (true);
CREATE POLICY "Anyone can insert rag chunks" ON public.rag_document_chunks FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update rag chunks" ON public.rag_document_chunks FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Anyone can delete rag chunks" ON public.rag_document_chunks FOR DELETE USING (true);

CREATE INDEX IF NOT EXISTS idx_rag_chunks_document ON public.rag_document_chunks(document_id);
CREATE INDEX IF NOT EXISTS idx_rag_chunks_embedding
  ON public.rag_document_chunks USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- Similarity search RPC
CREATE OR REPLACE FUNCTION public.match_rag_chunks(
  query_embedding vector(768),
  doc_id uuid,
  match_count integer DEFAULT 5
)
RETURNS TABLE (
  id uuid,
  chunk_index integer,
  page_number integer,
  content text,
  similarity float
)
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT
    c.id,
    c.chunk_index,
    c.page_number,
    c.content,
    1 - (c.embedding <=> query_embedding) AS similarity
  FROM public.rag_document_chunks c
  WHERE c.document_id = doc_id
    AND c.embedding IS NOT NULL
  ORDER BY c.embedding <=> query_embedding
  LIMIT match_count;
$$;

-- Storage bucket for uploaded RAG documents
INSERT INTO storage.buckets (id, name, public)
VALUES ('rag-documents', 'rag-documents', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Anyone can read rag-documents files"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'rag-documents');

CREATE POLICY "Anyone can upload rag-documents files"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'rag-documents');

CREATE POLICY "Anyone can update rag-documents files"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'rag-documents');

CREATE POLICY "Anyone can delete rag-documents files"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'rag-documents');

-- =============================================================
-- 2) Daily AI practice plan
-- =============================================================
CREATE TABLE IF NOT EXISTS public.practice_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL,
  student_name text NOT NULL DEFAULT '',
  plan_date date NOT NULL DEFAULT CURRENT_DATE,
  summary text NOT NULL DEFAULT '',
  completed_modules jsonb NOT NULL DEFAULT '[]'::jsonb,
  generated_at timestamptz NOT NULL DEFAULT now(),
  model_used text NOT NULL DEFAULT '',
  UNIQUE (student_id, plan_date)
);

ALTER TABLE public.practice_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read practice plans" ON public.practice_plans FOR SELECT USING (true);
CREATE POLICY "Anyone can insert practice plans" ON public.practice_plans FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update practice plans" ON public.practice_plans FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Anyone can delete practice plans" ON public.practice_plans FOR DELETE USING (true);

CREATE TABLE IF NOT EXISTS public.practice_plan_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id uuid NOT NULL REFERENCES public.practice_plans(id) ON DELETE CASCADE,
  sort_order integer NOT NULL DEFAULT 0,
  task_type text NOT NULL DEFAULT 'prompt', -- prompt | agent | reflection | challenge
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  suggested_tool text NOT NULL DEFAULT '', -- e.g. "AI Playground", "Prompt Lab", "Coding"
  estimated_minutes integer NOT NULL DEFAULT 10,
  related_module_id integer,
  completed boolean NOT NULL DEFAULT false,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.practice_plan_tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read plan tasks" ON public.practice_plan_tasks FOR SELECT USING (true);
CREATE POLICY "Anyone can insert plan tasks" ON public.practice_plan_tasks FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update plan tasks" ON public.practice_plan_tasks FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Anyone can delete plan tasks" ON public.practice_plan_tasks FOR DELETE USING (true);

CREATE INDEX IF NOT EXISTS idx_plan_tasks_plan ON public.practice_plan_tasks(plan_id);

-- =============================================================
-- 3) Video lessons: support student-uploaded videos
-- =============================================================
ALTER TABLE public.video_lessons
  ADD COLUMN IF NOT EXISTS uploader_id text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS uploader_role text NOT NULL DEFAULT 'admin',
  ADD COLUMN IF NOT EXISTS source_type text NOT NULL DEFAULT 'youtube', -- youtube | upload
  ADD COLUMN IF NOT EXISTS media_url text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS transcript text NOT NULL DEFAULT '';

-- Storage bucket for uploaded lesson videos
INSERT INTO storage.buckets (id, name, public)
VALUES ('lesson-videos', 'lesson-videos', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Anyone can read lesson-videos files"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'lesson-videos');

CREATE POLICY "Anyone can upload lesson-videos files"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'lesson-videos');

CREATE POLICY "Anyone can delete lesson-videos files"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'lesson-videos');

-- =============================================================
-- 4) Video quiz attempts
-- =============================================================
CREATE TABLE IF NOT EXISTS public.video_quiz_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id uuid NOT NULL,
  student_id uuid,
  student_name text NOT NULL DEFAULT '',
  total_questions integer NOT NULL DEFAULT 0,
  correct_answers integer NOT NULL DEFAULT 0,
  score integer NOT NULL DEFAULT 0,
  time_taken_seconds integer NOT NULL DEFAULT 0,
  answers jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.video_quiz_attempts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read video quiz attempts" ON public.video_quiz_attempts FOR SELECT USING (true);
CREATE POLICY "Anyone can insert video quiz attempts" ON public.video_quiz_attempts FOR INSERT WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_video_quiz_attempts_student ON public.video_quiz_attempts(student_id);
CREATE INDEX IF NOT EXISTS idx_video_quiz_attempts_lesson ON public.video_quiz_attempts(lesson_id);

-- =============================================================
-- 5) Coordinator feedback
-- =============================================================
CREATE TABLE IF NOT EXISTS public.coordinator_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL,
  student_name text NOT NULL DEFAULT '',
  reviewer_id text NOT NULL DEFAULT '',
  reviewer_name text NOT NULL DEFAULT '',
  reviewer_role text NOT NULL DEFAULT 'trainer', -- trainer | admin
  category text NOT NULL DEFAULT 'general', -- general | onboarding | quiz | project
  reference_id text NOT NULL DEFAULT '',
  rating integer,
  feedback text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.coordinator_feedback ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read coordinator feedback" ON public.coordinator_feedback FOR SELECT USING (true);
CREATE POLICY "Anyone can insert coordinator feedback" ON public.coordinator_feedback FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update coordinator feedback" ON public.coordinator_feedback FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Anyone can delete coordinator feedback" ON public.coordinator_feedback FOR DELETE USING (true);

CREATE INDEX IF NOT EXISTS idx_coordinator_feedback_student ON public.coordinator_feedback(student_id);

-- Update triggers
DROP TRIGGER IF EXISTS trg_rag_documents_updated ON public.rag_documents;
CREATE TRIGGER trg_rag_documents_updated BEFORE UPDATE ON public.rag_documents
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();