
-- Learning Paths table
CREATE TABLE public.learning_paths (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  required_tier text NOT NULL DEFAULT 'free',
  status text NOT NULL DEFAULT 'draft',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.learning_paths ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read learning paths" ON public.learning_paths FOR SELECT USING (true);
CREATE POLICY "Anyone can insert learning paths" ON public.learning_paths FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update learning paths" ON public.learning_paths FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Anyone can delete learning paths" ON public.learning_paths FOR DELETE USING (true);

-- Learning Path Modules junction table
CREATE TABLE public.learning_path_modules (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  path_id uuid NOT NULL REFERENCES public.learning_paths(id) ON DELETE CASCADE,
  module_id integer NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.learning_path_modules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read path modules" ON public.learning_path_modules FOR SELECT USING (true);
CREATE POLICY "Anyone can insert path modules" ON public.learning_path_modules FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update path modules" ON public.learning_path_modules FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Anyone can delete path modules" ON public.learning_path_modules FOR DELETE USING (true);

-- Learning Path Assignments (cohort-based)
CREATE TABLE public.learning_path_assignments (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  path_id uuid NOT NULL REFERENCES public.learning_paths(id) ON DELETE CASCADE,
  college text NOT NULL DEFAULT '',
  department text NOT NULL DEFAULT '',
  degree text NOT NULL DEFAULT '',
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.learning_path_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read path assignments" ON public.learning_path_assignments FOR SELECT USING (true);
CREATE POLICY "Anyone can insert path assignments" ON public.learning_path_assignments FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update path assignments" ON public.learning_path_assignments FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Anyone can delete path assignments" ON public.learning_path_assignments FOR DELETE USING (true);
