
CREATE TABLE public.menu_access_controls (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  menu_key text NOT NULL,
  free_access boolean NOT NULL DEFAULT true,
  premium_access boolean NOT NULL DEFAULT true,
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (menu_key)
);

ALTER TABLE public.menu_access_controls ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read menu access" ON public.menu_access_controls FOR SELECT TO public USING (true);
CREATE POLICY "Anyone can insert menu access" ON public.menu_access_controls FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Anyone can update menu access" ON public.menu_access_controls FOR UPDATE TO public USING (true) WITH CHECK (true);

-- Seed default values
INSERT INTO public.menu_access_controls (menu_key, free_access, premium_access) VALUES
  ('modules', true, true),
  ('videos', true, true),
  ('playground', true, true),
  ('coding', true, true),
  ('prompts', true, true),
  ('tools', false, true),
  ('assessments', true, true),
  ('projects', false, true);
