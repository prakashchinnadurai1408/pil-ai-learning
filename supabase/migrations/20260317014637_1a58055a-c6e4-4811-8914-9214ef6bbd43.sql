
CREATE TABLE public.student_solved_challenges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_name text NOT NULL,
  challenge_id integer NOT NULL,
  language text NOT NULL,
  solved_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (student_name, challenge_id)
);

ALTER TABLE public.student_solved_challenges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read solved challenges" ON public.student_solved_challenges FOR SELECT TO public USING (true);
CREATE POLICY "Anyone can insert solved challenges" ON public.student_solved_challenges FOR INSERT TO public WITH CHECK (true);
