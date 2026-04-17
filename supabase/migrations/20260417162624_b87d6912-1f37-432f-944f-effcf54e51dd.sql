
CREATE TABLE public.candidate_learning_paths (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  candidate_id UUID NOT NULL,
  candidate_name TEXT NOT NULL DEFAULT '',
  title TEXT NOT NULL DEFAULT 'My Personalized Learning Path',
  rationale TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'active',
  source TEXT NOT NULL DEFAULT 'ai',
  model_used TEXT NOT NULL DEFAULT '',
  is_beginner_default BOOLEAN NOT NULL DEFAULT false,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.candidate_learning_path_modules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  path_id UUID NOT NULL REFERENCES public.candidate_learning_paths(id) ON DELETE CASCADE,
  module_id INTEGER NOT NULL,
  module_title TEXT NOT NULL DEFAULT '',
  sort_order INTEGER NOT NULL DEFAULT 0,
  reason TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_candidate_paths_candidate_id ON public.candidate_learning_paths(candidate_id);
CREATE INDEX idx_candidate_path_modules_path_id ON public.candidate_learning_path_modules(path_id);

ALTER TABLE public.candidate_learning_paths ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.candidate_learning_path_modules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read candidate paths" ON public.candidate_learning_paths FOR SELECT USING (true);
CREATE POLICY "Anyone can insert candidate paths" ON public.candidate_learning_paths FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update candidate paths" ON public.candidate_learning_paths FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Anyone can delete candidate paths" ON public.candidate_learning_paths FOR DELETE USING (true);

CREATE POLICY "Anyone can read candidate path modules" ON public.candidate_learning_path_modules FOR SELECT USING (true);
CREATE POLICY "Anyone can insert candidate path modules" ON public.candidate_learning_path_modules FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update candidate path modules" ON public.candidate_learning_path_modules FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Anyone can delete candidate path modules" ON public.candidate_learning_path_modules FOR DELETE USING (true);
