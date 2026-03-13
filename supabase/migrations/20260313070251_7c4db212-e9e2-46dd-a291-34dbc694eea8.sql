
CREATE TABLE public.admin_section_content (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id integer REFERENCES public.admin_modules(id) ON DELETE CASCADE,
  section_type text NOT NULL CHECK (section_type IN ('videos', 'ai_chat', 'tools', 'assessments', 'projects')),
  title text NOT NULL,
  content jsonb NOT NULL DEFAULT '{}',
  status text NOT NULL DEFAULT 'draft',
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.admin_section_content ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read section content" ON public.admin_section_content FOR SELECT TO public USING (true);
CREATE POLICY "Anyone can insert section content" ON public.admin_section_content FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Anyone can update section content" ON public.admin_section_content FOR UPDATE TO public USING (true) WITH CHECK (true);
CREATE POLICY "Anyone can delete section content" ON public.admin_section_content FOR DELETE TO public USING (true);
