
CREATE TABLE public.quiz_question_bank (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id integer NOT NULL,
  module_name text NOT NULL,
  question text NOT NULL,
  options jsonb NOT NULL DEFAULT '[]'::jsonb,
  correct integer NOT NULL,
  explanation text NOT NULL DEFAULT '',
  source text NOT NULL DEFAULT 'ai',
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.quiz_question_bank ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read quiz questions" ON public.quiz_question_bank FOR SELECT TO public USING (true);
CREATE POLICY "Anyone can insert quiz questions" ON public.quiz_question_bank FOR INSERT TO public WITH CHECK (true);
