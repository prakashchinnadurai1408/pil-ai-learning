
-- Assessments table: main assessment entity
CREATE TABLE public.assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  module_id INTEGER REFERENCES public.admin_modules(id) ON DELETE SET NULL,
  created_by TEXT NOT NULL DEFAULT 'admin',
  created_by_name TEXT NOT NULL DEFAULT '',
  assigned_colleges TEXT[] NOT NULL DEFAULT '{}',
  time_limit_minutes INTEGER DEFAULT NULL,
  max_attempts INTEGER DEFAULT NULL,
  passing_score INTEGER NOT NULL DEFAULT 60,
  status TEXT NOT NULL DEFAULT 'draft',
  question_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Assessment questions table
CREATE TABLE public.assessment_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id UUID REFERENCES public.assessments(id) ON DELETE CASCADE NOT NULL,
  question TEXT NOT NULL,
  options JSONB NOT NULL DEFAULT '[]',
  correct INTEGER NOT NULL,
  explanation TEXT NOT NULL DEFAULT '',
  sort_order INTEGER NOT NULL DEFAULT 0,
  source TEXT NOT NULL DEFAULT 'manual',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Assessment attempts table
CREATE TABLE public.assessment_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id UUID REFERENCES public.assessments(id) ON DELETE CASCADE NOT NULL,
  student_id UUID NOT NULL,
  student_name TEXT NOT NULL DEFAULT '',
  student_college TEXT NOT NULL DEFAULT '',
  score INTEGER NOT NULL DEFAULT 0,
  total_questions INTEGER NOT NULL DEFAULT 0,
  correct_answers INTEGER NOT NULL DEFAULT 0,
  time_taken_seconds INTEGER DEFAULT NULL,
  answers JSONB NOT NULL DEFAULT '{}',
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ DEFAULT NULL
);

-- Enable RLS
ALTER TABLE public.assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assessment_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assessment_attempts ENABLE ROW LEVEL SECURITY;

-- RLS policies for assessments
CREATE POLICY "Anyone can read assessments" ON public.assessments FOR SELECT TO public USING (true);
CREATE POLICY "Anyone can insert assessments" ON public.assessments FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Anyone can update assessments" ON public.assessments FOR UPDATE TO public USING (true) WITH CHECK (true);
CREATE POLICY "Anyone can delete assessments" ON public.assessments FOR DELETE TO public USING (true);

-- RLS policies for assessment_questions
CREATE POLICY "Anyone can read assessment questions" ON public.assessment_questions FOR SELECT TO public USING (true);
CREATE POLICY "Anyone can insert assessment questions" ON public.assessment_questions FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Anyone can update assessment questions" ON public.assessment_questions FOR UPDATE TO public USING (true) WITH CHECK (true);
CREATE POLICY "Anyone can delete assessment questions" ON public.assessment_questions FOR DELETE TO public USING (true);

-- RLS policies for assessment_attempts
CREATE POLICY "Anyone can read assessment attempts" ON public.assessment_attempts FOR SELECT TO public USING (true);
CREATE POLICY "Anyone can insert assessment attempts" ON public.assessment_attempts FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Anyone can update assessment attempts" ON public.assessment_attempts FOR UPDATE TO public USING (true) WITH CHECK (true);

-- Enable realtime for attempts (for live dashboard)
ALTER PUBLICATION supabase_realtime ADD TABLE public.assessment_attempts;
