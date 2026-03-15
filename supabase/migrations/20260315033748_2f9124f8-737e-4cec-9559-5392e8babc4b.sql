
CREATE TABLE public.student_project_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_name TEXT NOT NULL,
  stream_id TEXT NOT NULL,
  completed_steps JSONB NOT NULL DEFAULT '{}',
  completed_docs JSONB NOT NULL DEFAULT '{}',
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (student_name, stream_id)
);

ALTER TABLE public.student_project_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read project progress" ON public.student_project_progress FOR SELECT TO public USING (true);
CREATE POLICY "Anyone can insert project progress" ON public.student_project_progress FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Anyone can update project progress" ON public.student_project_progress FOR UPDATE TO public USING (true) WITH CHECK (true);
