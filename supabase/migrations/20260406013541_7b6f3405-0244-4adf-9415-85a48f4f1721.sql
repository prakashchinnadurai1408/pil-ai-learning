
ALTER TABLE public.student_project_progress 
  ADD COLUMN project_title text NOT NULL DEFAULT '',
  ADD COLUMN project_description text NOT NULL DEFAULT '';

CREATE TABLE public.project_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_name text NOT NULL,
  stream_id text NOT NULL,
  step_number integer,
  feedback text NOT NULL,
  reviewer_name text NOT NULL DEFAULT '',
  reviewer_role text NOT NULL DEFAULT 'trainer',
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.project_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read project feedback" ON public.project_feedback FOR SELECT TO public USING (true);
CREATE POLICY "Anyone can insert project feedback" ON public.project_feedback FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Anyone can delete project feedback" ON public.project_feedback FOR DELETE TO public USING (true);
