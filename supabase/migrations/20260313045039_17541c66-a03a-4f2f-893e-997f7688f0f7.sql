
CREATE TABLE public.admin_modules (
  id serial PRIMARY KEY,
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  icon_name text NOT NULL DEFAULT 'BookOpen',
  color text NOT NULL DEFAULT 'from-primary to-blue-600',
  duration text NOT NULL DEFAULT '2 hours',
  status text NOT NULL DEFAULT 'draft',
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.admin_module_topics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id integer NOT NULL REFERENCES public.admin_modules(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  suggested_videos text[] NOT NULL DEFAULT '{}',
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.admin_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_module_topics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read modules" ON public.admin_modules FOR SELECT TO public USING (true);
CREATE POLICY "Anyone can insert modules" ON public.admin_modules FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Anyone can update modules" ON public.admin_modules FOR UPDATE TO public USING (true) WITH CHECK (true);
CREATE POLICY "Anyone can delete modules" ON public.admin_modules FOR DELETE TO public USING (true);

CREATE POLICY "Anyone can read topics" ON public.admin_module_topics FOR SELECT TO public USING (true);
CREATE POLICY "Anyone can insert topics" ON public.admin_module_topics FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Anyone can update topics" ON public.admin_module_topics FOR UPDATE TO public USING (true) WITH CHECK (true);
CREATE POLICY "Anyone can delete topics" ON public.admin_module_topics FOR DELETE TO public USING (true);
