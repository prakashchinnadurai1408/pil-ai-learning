
CREATE TABLE public.coding_challenges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  difficulty text NOT NULL DEFAULT 'Easy',
  category text NOT NULL DEFAULT 'Basics',
  description text NOT NULL,
  sample_input text,
  sample_output text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  source text NOT NULL DEFAULT 'ai'
);

ALTER TABLE public.coding_challenges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read coding challenges" ON public.coding_challenges FOR SELECT TO public USING (true);
CREATE POLICY "Anyone can insert coding challenges" ON public.coding_challenges FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Anyone can delete coding challenges" ON public.coding_challenges FOR DELETE TO public USING (true);
