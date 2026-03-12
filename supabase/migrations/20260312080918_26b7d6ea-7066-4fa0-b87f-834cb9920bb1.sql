
-- Students table
CREATE TABLE public.students (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text NOT NULL,
  college text NOT NULL,
  location text NOT NULL,
  mobile text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read students" ON public.students FOR SELECT TO public USING (true);
CREATE POLICY "Anyone can insert students" ON public.students FOR INSERT TO public WITH CHECK (true);

-- Student module progress
CREATE TABLE public.student_module_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid REFERENCES public.students(id) ON DELETE CASCADE NOT NULL,
  module_id int NOT NULL,
  completed boolean NOT NULL DEFAULT false,
  progress_percent int NOT NULL DEFAULT 0,
  last_accessed timestamptz DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.student_module_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read module progress" ON public.student_module_progress FOR SELECT TO public USING (true);
CREATE POLICY "Anyone can insert module progress" ON public.student_module_progress FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Anyone can update module progress" ON public.student_module_progress FOR UPDATE TO public USING (true) WITH CHECK (true);

-- Student assessment scores
CREATE TABLE public.student_assessment_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid REFERENCES public.students(id) ON DELETE CASCADE NOT NULL,
  module_id int NOT NULL,
  score int NOT NULL,
  total_questions int NOT NULL,
  correct_answers int NOT NULL,
  attempted_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.student_assessment_scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read scores" ON public.student_assessment_scores FOR SELECT TO public USING (true);
CREATE POLICY "Anyone can insert scores" ON public.student_assessment_scores FOR INSERT TO public WITH CHECK (true);
